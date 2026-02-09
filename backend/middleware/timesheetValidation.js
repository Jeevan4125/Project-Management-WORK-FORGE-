const { body } = require('express-validator');

exports.validateTimesheetEntry = [
  body('projectId')
    .notEmpty().withMessage('Project is required')
    .isMongoId().withMessage('Invalid project ID'),
  
  body('task')
    .notEmpty().withMessage('Task description is required')
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Task must be between 3 and 200 characters'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('billable')
    .optional()
    .isBoolean().withMessage('Billable must be true or false'),
  
  body('hours')
    .optional()
    .isFloat({ min: 0, max: 24 }).withMessage('Hours must be between 0 and 24')
];