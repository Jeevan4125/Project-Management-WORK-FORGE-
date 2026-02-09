const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 10;
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupName);
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'workforge_db'
    };

    try {
      // Create mysqldump command
      const dumpCommand = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > ${backupPath}`;
      
      await execPromise(dumpCommand);
      
      // Get file size
      const stats = await fs.stat(backupPath);
      const size = this.formatFileSize(stats.size);
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      return {
        name: backupName,
        path: backupPath,
        size: size,
        created: new Date().toISOString()
      };
    } catch (error) {
      console.error('Backup creation error:', error);
      throw new Error('Failed to create backup: ' + error.message);
    }
  }

  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Check if backup file exists
      await fs.access(backupPath);
      
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'workforge_db'
      };

      // Create restore command
      const restoreCommand = `mysql -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < ${backupPath}`;
      
      await execPromise(restoreCommand);
      
      return true;
    } catch (error) {
      console.error('Restore error:', error);
      throw new Error('Failed to restore backup: ' + error.message);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            name: file,
            size: this.formatFileSize(stats.size),
            created: stats.birthtime.toISOString(),
            path: filePath
          });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return backups;
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      await fs.unlink(backupPath);
      return true;
    } catch (error) {
      console.error('Delete backup error:', error);
      throw new Error('Failed to delete backup: ' + error.message);
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          await fs.unlink(backup.path);
        }
      }
    } catch (error) {
      console.error('Cleanup backups error:', error);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new BackupService();