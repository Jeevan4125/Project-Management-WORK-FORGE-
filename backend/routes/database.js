const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const database = require('../config/database');
const backupService = require('../utils/backupService');
const databaseAuth = require('../middleware/databaseAuth');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json', '.sql', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, JSON, SQL, and Excel files are allowed.'));
    }
  }
});

// GET all tables
router.get('/tables', databaseAuth.requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        TABLE_NAME as name,
        TABLE_ROWS as rows,
        DATA_LENGTH as size,
        ENGINE as engine,
        TABLE_COLLATION as collation
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `;
    
    const tables = await database.query(query);
    
    // Format the response
    const formattedTables = tables.map(table => ({
      name: table.name,
      rows: parseInt(table.rows) || 0,
      size: table.size ? (table.size / 1024).toFixed(2) + ' KB' : '0 KB',
      engine: table.engine,
      collation: table.collation
    }));
    
    res.json({ tables: formattedTables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// GET table data and structure
router.get('/table/:tableName', databaseAuth.requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    // Get table structure
    const structureQuery = `DESCRIBE ${tableName}`;
    const structure = await database.query(structureQuery);
    
    // Build search condition
    let searchCondition = '';
    let searchParams = [];
    
    if (search) {
      const searchFields = structure.map(col => `${col.Field} LIKE ?`).join(' OR ');
      searchCondition = `WHERE ${searchFields}`;
      searchParams = Array(structure.length).fill(`%${search}%`);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${searchCondition}`;
    const countResult = await database.query(countQuery, searchParams);
    const total = countResult[0]?.total || 0;
    
    // Get paginated data
    const dataQuery = `
      SELECT * FROM ${tableName} 
      ${searchCondition}
      LIMIT ? OFFSET ?
    `;
    
    const data = await database.query(dataQuery, [...searchParams, parseInt(limit), offset]);
    
    res.json({
      data,
      structure,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// POST execute SQL query
router.post('/query', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Check for dangerous queries in production
    if (process.env.NODE_ENV === 'production') {
      const dangerousKeywords = ['DROP DATABASE', 'DELETE FROM', 'TRUNCATE', 'ALTER TABLE'];
      const upperQuery = query.toUpperCase();
      
      if (dangerousKeywords.some(keyword => upperQuery.includes(keyword))) {
        return res.status(403).json({ error: 'This query is not allowed in production' });
      }
    }
    
    // Execute query
    const result = await database.query(query);
    
    // Format response
    if (Array.isArray(result)) {
      if (result.length > 0) {
        const fields = Object.keys(result[0]).map(key => ({ name: key }));
        res.json({
          fields,
          rows: result,
          rowCount: result.length
        });
      } else {
        res.json({
          fields: [],
          rows: [],
          rowCount: 0,
          message: 'Query executed successfully but returned no results'
        });
      }
    } else {
      res.json({
        affectedRows: result.affectedRows || 0,
        insertId: result.insertId || null,
        message: 'Query executed successfully'
      });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message || 'Failed to execute query' });
  }
});

// POST create new table
router.post('/create-table', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { name, fields } = req.body;
    
    if (!name || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Table name and fields are required' });
    }
    
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return res.status(400).json({ error: 'Invalid table name. Use only letters, numbers, and underscores' });
    }
    
    // Build CREATE TABLE query
    const fieldDefinitions = fields.map(field => {
      let definition = `${field.name} ${field.type}`;
      
      if (field.nullable === false) {
        definition += ' NOT NULL';
      }
      
      if (field.auto_increment) {
        definition += ' AUTO_INCREMENT';
      }
      
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        definition += ` DEFAULT '${field.defaultValue}'`;
      }
      
      if (field.primary) {
        definition += ' PRIMARY KEY';
      }
      
      return definition;
    }).join(', ');
    
    const createQuery = `CREATE TABLE IF NOT EXISTS ${name} (${fieldDefinitions})`;
    
    await database.execute(createQuery);
    
    res.json({ 
      success: true, 
      message: `Table "${name}" created successfully` 
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message || 'Failed to create table' });
  }
});

// DELETE table
router.delete('/table/:tableName', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    const dropQuery = `DROP TABLE IF EXISTS ${tableName}`;
    await database.execute(dropQuery);
    
    res.json({ 
      success: true, 
      message: `Table "${tableName}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: error.message || 'Failed to delete table' });
  }
});

// GET list backups
router.get('/backups', databaseAuth.requireAuth, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// POST create backup
router.post('/backup', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const backup = await backupService.createBackup();
    res.json({ 
      success: true, 
      message: 'Backup created successfully',
      backupName: backup.name,
      backup
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message || 'Failed to create backup' });
  }
});

// POST restore backup
router.post('/restore', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { backupName } = req.body;
    
    if (!backupName) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    await backupService.restoreBackup(backupName);
    
    res.json({ 
      success: true, 
      message: 'Backup restored successfully' 
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: error.message || 'Failed to restore backup' });
  }
});

// DELETE backup
router.delete('/backup/:backupName', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({ error: 'Backup name is required' });
    }
    
    await backupService.deleteBackup(backupName);
    
    res.json({ 
      success: true, 
      message: 'Backup deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message || 'Failed to delete backup' });
  }
});

// POST import data
router.post('/import', databaseAuth.requireHRorAdmin, upload.single('file'), async (req, res) => {
  try {
    const { table, format } = req.body;
    const file = req.file;
    
    if (!file || !table) {
      return res.status(400).json({ error: 'File and table name are required' });
    }
    
    let importedRows = 0;
    const filePath = file.path;
    
    switch (format) {
      case 'csv':
        importedRows = await this.importCSV(filePath, table);
        break;
      case 'json':
        importedRows = await this.importJSON(filePath, table);
        break;
      case 'excel':
        importedRows = await this.importExcel(filePath, table);
        break;
      default:
        throw new Error('Unsupported format');
    }
    
    // Cleanup uploaded file
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: `Data imported successfully`,
      imported: importedRows
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: error.message || 'Failed to import data' });
  }
});

// Helper methods for import
router.importCSV = async (filePath, tableName) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        try {
          let inserted = 0;
          for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(val => `'${val}'`).join(', ');
            const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
            await database.execute(insertQuery);
            inserted++;
          }
          resolve(inserted);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
};

router.importJSON = async (filePath, tableName) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const rows = JSON.parse(data);
    
    let inserted = 0;
    for (const row of rows) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(val => `'${val}'`).join(', ');
      const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
      await database.execute(insertQuery);
      inserted++;
    }
    
    return inserted;
  } catch (error) {
    throw error;
  }
};

router.importExcel = async (filePath, tableName) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);
    
    let inserted = 0;
    for (const row of rows) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(val => `'${val}'`).join(', ');
      const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
      await database.execute(insertQuery);
      inserted++;
    }
    
    return inserted;
  } catch (error) {
    throw error;
  }
};

// GET export data
router.get('/export/:tableName', databaseAuth.requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { format = 'csv' } = req.query;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    // Get table data
    const query = `SELECT * FROM ${tableName}`;
    const data = await database.query(query);
    
    let fileContent, fileName, contentType;
    
    switch (format) {
      case 'csv':
        fileName = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
        fileContent = this.convertToCSV(data);
        break;
      case 'json':
        fileName = `${tableName}_${new Date().toISOString().split('T')[0]}.json`;
        contentType = 'application/json';
        fileContent = JSON.stringify(data, null, 2);
        break;
      case 'sql':
        fileName = `${tableName}_${new Date().toISOString().split('T')[0]}.sql`;
        contentType = 'application/sql';
        fileContent = this.convertToSQL(data, tableName);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported export format' });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileContent);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message || 'Failed to export data' });
  }
});

// Helper methods for export
router.convertToCSV = (data) => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
};

router.convertToSQL = (data, tableName) => {
  if (data.length === 0) return '';
  
  const insertStatements = data.map(row => {
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row).map(val => 
      val === null ? 'NULL' : `'${val.toString().replace(/'/g, "''")}'`
    ).join(', ');
    
    return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
  });
  
  return insertStatements.join('\n');
};

// GET table statistics
router.get('/table/:tableName/stats', databaseAuth.requireAuth, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rows,
        SUM(DATA_LENGTH + INDEX_LENGTH) as total_size,
        MAX(UPDATE_TIME) as last_updated,
        CREATE_TIME as created
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      GROUP BY TABLE_NAME
    `;
    
    const stats = await database.query(statsQuery, [tableName]);
    
    if (stats.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const formattedStats = {
      totalRows: stats[0].total_rows || 0,
      totalSize: stats[0].total_size ? (stats[0].total_size / 1024).toFixed(2) + ' KB' : '0 KB',
      lastUpdated: stats[0].last_updated || 'Never',
      created: stats[0].created
    };
    
    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching table stats:', error);
    res.status(500).json({ error: 'Failed to fetch table statistics' });
  }
});

// POST add column to table
router.post('/table/:tableName/column', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { name, type } = req.body;
    
    if (!tableName || !name || !type) {
      return res.status(400).json({ error: 'Table name, column name, and type are required' });
    }
    
    const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${name} ${type}`;
    await database.execute(alterQuery);
    
    res.json({ 
      success: true, 
      message: `Column "${name}" added to table "${tableName}" successfully` 
    });
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({ error: error.message || 'Failed to add column' });
  }
});

// POST optimize table
router.post('/table/:tableName/optimize', databaseAuth.requireHRorAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    const optimizeQuery = `OPTIMIZE TABLE ${tableName}`;
    await database.execute(optimizeQuery);
    
    res.json({ 
      success: true, 
      message: `Table "${tableName}" optimized successfully` 
    });
  } catch (error) {
    console.error('Error optimizing table:', error);
    res.status(500).json({ error: error.message || 'Failed to optimize table' });
  }
});

module.exports = router;