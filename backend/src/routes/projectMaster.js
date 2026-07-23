import express from 'express';
import { Op } from 'sequelize';
import ProjectMaster from '../models/projectMaster.js';
import CustomerMaster from '../models/customerMaster.js';
import EmployeeMaster from '../models/employeeMaster.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate next project code for a company
const generateProjectCode = async (companyId) => {
  const count = await ProjectMaster.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `PRJ-${nextNum}`;
};

// GET /api/master/projects — list all with optional search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { projectName: { [Op.like]: `%${search}%` } },
        { projectCode: { [Op.like]: `%${search}%` } },
        { '$Customer.customerName$': { [Op.like]: `%${search}%` } },
        { '$ProjectManager.employeeName$': { [Op.like]: `%${search}%` } }
      ];
    }

    const projects = await ProjectMaster.findAll({
      where: whereClause,
      include: [
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'ProjectManager', attributes: ['id', 'employeeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/master/projects/:id — single project
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const project = await ProjectMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'ProjectManager', attributes: ['id', 'employeeName'] }
      ]
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/master/projects — create
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      projectName, projectValue, startDate, endDate,
      status, CustomerMasterId, ProjectManagerId, projectCode, customFields
    } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: 'Project Name is required' });
    }

    let code = projectCode;
    if (!code || code.trim() === '') {
      code = await generateProjectCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newProject = await ProjectMaster.create({
      projectCode: code,
      projectName,
      projectValue: projectValue || 0,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'Active',
      CustomerMasterId: CustomerMasterId || null,
      ProjectManagerId: ProjectManagerId || null,
      customFields: customFields || null,
      CompanyId: req.user.CompanyId
    });

    // Fetch the created project with includes to return to the frontend
    const createdProject = await ProjectMaster.findOne({
      where: { id: newProject.id },
      include: [
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'ProjectManager', attributes: ['id', 'employeeName'] }
      ]
    });

    res.status(201).json(createdProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/master/projects/:id — update
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    console.log('PUT Project request body:', req.body);
    const project = await ProjectMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const {
      projectName, projectValue, startDate, endDate,
      status, CustomerMasterId, ProjectManagerId, projectCode, customFields
    } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: 'Project Name is required' });
    }

    await project.update({
      projectCode: projectCode !== undefined ? (projectCode?.trim() || project.projectCode) : project.projectCode,
      projectName,
      projectValue: projectValue !== undefined ? projectValue : project.projectValue,
      startDate: startDate !== undefined ? (startDate || null) : project.startDate,
      endDate: endDate !== undefined ? (endDate || null) : project.endDate,
      status: status !== undefined ? status : project.status,
      CustomerMasterId: CustomerMasterId !== undefined ? (CustomerMasterId || null) : project.CustomerMasterId,
      ProjectManagerId: ProjectManagerId !== undefined ? (ProjectManagerId || null) : project.ProjectManagerId,
      customFields: customFields !== undefined ? customFields : project.customFields
    });

    const updatedProject = await ProjectMaster.findOne({
      where: { id: project.id },
      include: [
        { model: CustomerMaster, as: 'Customer', attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'ProjectManager', attributes: ['id', 'employeeName'] }
      ]
    });

    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/master/projects/:id — delete (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const project = await ProjectMaster.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.destroy();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
