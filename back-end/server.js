const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('TimeLog Backend Running');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Database Connection Failed');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

app.post('/tasks', async (req, res) => {
  try {
    const { employee_id, task_name, project_name, description, start_time, end_time, task_date } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks
      (employee_id, task_name, project_name, description, start_time, end_time, task_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [employee_id, task_name, project_name, description, start_time, end_time, task_date]
    );

    res.json(result.rows[0]);
  } catch (error) {
  console.error('Error saving task:', error);

  res.status(500).json({
    error: error.message
  });
}
});

app.get('/tasks-test', async (req, res) => {

  const result = await pool.query(
    'SELECT * FROM tasks'
  );

  res.json(result.rows);

});

app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        tasks.*,
        users.name AS employee_name
       FROM tasks
       JOIN users
       ON tasks.employee_id = users.id
       ORDER BY tasks.id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching tasks');
  }
});

app.put('/tasks/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const {
      task_name,
      project_name,
      description,
      start_time,
      end_time,
      task_date,
      status,
      review_comment,
      priority
    } = req.body;

    const result = await pool.query(
      `
      UPDATE tasks
      SET
        task_name = COALESCE($1, task_name),
        project_name = COALESCE($2, project_name),
        description = COALESCE($3, description),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        task_date = COALESCE($6, task_date),
        status = COALESCE($7, status),
        review_comment = COALESCE($8, review_comment),
        priority = COALESCE($9, priority),

        review_seen = CASE
            WHEN COALESCE($7, status) = 'Reviewed'
            THEN FALSE
            ELSE review_seen
        END,

        reviewed_at = CASE
            WHEN COALESCE($7, status) = 'Reviewed'
            THEN CURRENT_TIMESTAMP
            ELSE reviewed_at
        END

      WHERE id = $10

      RETURNING *;
      `,
      [
        task_name,
        project_name,
        description,
        start_time,
        end_time,
        task_date,
        status,
        review_comment,
        priority,
        id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting task');
  }
});

app.get('/leaves', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        leaves.*,
        users.name AS employee_name
       FROM leaves
       JOIN users
       ON leaves.employee_id = users.id
       ORDER BY leaves.id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching leaves');
  }
});

app.post('/leaves', async (req, res) => {
  try {
    const {
      employee_id,
      leave_type,
      from_date,
      to_date,
      days,
      reason
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leaves
      (employee_id, leave_type, from_date, to_date, days, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING *`,
      [employee_id, leave_type, from_date, to_date, days, reason]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving leave');
  }
});

app.put('/employees/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { name, designation, department, phone, hired_date } = req.body;

    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET name = $1
       WHERE id = $2 AND role = 'employee'`,
      [name, id]
    );

    await client.query(
      `UPDATE employee_profiles
       SET designation = $1,
           department = $2,
           phone = $3,
           hired_date = $4
       WHERE user_id = $5`,
      [designation, department, phone, hired_date, id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Employee updated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating employee:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/employees/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET verified = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error verifying employee');
  }
});

app.put('/employees/:id/unverify', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET verified = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error unverifying employee');
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, name, email, role, verified FROM users WHERE id = $1',
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const result = await pool.query(
      'SELECT id, name, email, role, verified FROM users WHERE email = $1 AND password = $2 AND role = $3',
      [email, password, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid login details' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Login failed');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const result = await pool.query(
      `SELECT id, name, email, role, verified
       FROM users
       WHERE email = $1 AND password = $2 AND role = $3`,
      [email, password, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email, password, or role'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Login failed');
  }
});

app.get('/employer-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM employer_profiles
       WHERE user_id = $1`,
      [userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading employer profile');
  }
});

app.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.email,
        users.role,
        users.verified,
        employee_profiles.department,
        employee_profiles.designation,
        employee_profiles.phone,
        employee_profiles.hired_date
      FROM users
      LEFT JOIN employee_profiles
      ON users.id = employee_profiles.user_id
      WHERE users.role = 'employee'
      ORDER BY users.id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching employees');
  }
});

app.post('/employees', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      name,
      designation,
      department,
      phone,
      hired_date
    } = req.body;

    await client.query('BEGIN');

    const placeholderEmail =
      `pending_${Date.now()}@timelogsystem.com`;

    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role, verified)
       VALUES ($1, $2, $3, 'employee', false)
       RETURNING id, name, role, verified`,
      [name, placeholderEmail, 'pending']
    );

    const user = userResult.rows[0];

    const employeeCode =
      'TLS-EMP-' + String(user.id).padStart(4, '0');

    const employeeNumber =
      String(user.id).padStart(4, '0');

    const generatedEmail =
      `emp${employeeNumber}@timelogsystem.com`;

    const tempPassword =
      'Temp@' + Math.floor(1000 + Math.random() * 9000);

    await client.query(
      `UPDATE users
       SET email = $1,
           password = $2
       WHERE id = $3`,
      [generatedEmail, tempPassword, user.id]
    );

    const profileResult = await client.query(
      `INSERT INTO employee_profiles
       (user_id, employee_code, department, designation, phone, hired_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.id,
        employeeCode,
        department,
        designation,
        phone,
        hired_date
      ]
    );

    await client.query('COMMIT');

    return res.json({
      id: user.id,
      name,
      email: generatedEmail,
      tempPassword,
      role: 'employee',
      verified: false,
      employee_code: employeeCode,
      department: profileResult.rows[0].department,
      designation: profileResult.rows[0].designation,
      phone: profileResult.rows[0].phone,
      hired_date: profileResult.rows[0].hired_date
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding employee:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM users
       WHERE id = $1
       AND role = 'employee'`,
      [id]
    );

    res.json({
      message: 'Employee removed successfully'
    });

  } catch (error) {
    console.error('Error removing employee:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

app.put('/employer-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      name,
      email,
      phone,
      designation,
      department,
      office_location,
      profile_image
    } = req.body;

    await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2
       WHERE id = $3 AND role = 'employer'`,
      [name, email, userId]
    );

    const result = await pool.query(
      `UPDATE employer_profiles
       SET phone = $1,
           designation = $2,
           department = $3,
           office_location = $4,
           profile_image = $5
       WHERE user_id = $6
       RETURNING *`,
      [phone, designation, department, office_location, profile_image, userId]
    );

    res.json({
      message: 'Employer profile updated successfully',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating employer profile:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const userResult = await pool.query(
      `SELECT password FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userResult.rows[0].password !== currentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    await pool.query(
      `UPDATE users
       SET password = $1
       WHERE id = $2`,
      [newPassword, id]
    );

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/employee-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT
        users.id,
        users.name,
        users.email,
        users.verified,
        employee_profiles.employee_code,
        employee_profiles.designation,
        employee_profiles.department,
        employee_profiles.phone,
        employee_profiles.address,
        employee_profiles.dob,
        employee_profiles.profile_image
       FROM users
       LEFT JOIN employee_profiles
       ON users.id = employee_profiles.user_id
       WHERE users.id = $1 AND users.role = 'employee'`,
      [userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error loading employee profile:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/employee-profile/:userId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;

    const {
      name,
      email,
      phone,
      designation,
      department,
      address,
      dob,
      profile_image
    } = req.body;

    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET name = $1,
           email = $2
       WHERE id = $3 AND role = 'employee'`,
      [name, email, userId]
    );

    await client.query(
      `UPDATE employee_profiles
       SET phone = $1,
           designation = $2,
           department = $3,
           address = $4,
           dob = $5,
           profile_image = $6
       WHERE user_id = $7`,
      [phone, designation, department, address, dob || null, profile_image, userId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Employee profile updated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating employee profile:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/leaves/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE leaves
       SET status = 'Approved',
           notification_seen = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/leaves/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const result = await pool.query(
      `UPDATE leaves
       SET status = 'Rejected',
           rejection_reason = $1,
           notification_seen = false
       WHERE id = $2
       RETURNING *`,
      [rejection_reason, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/employees/:employeeId/leave-notification', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await pool.query(
      `SELECT id, status, rejection_reason
       FROM leaves
       WHERE employee_id = $1
       AND status IN ('Approved', 'Rejected')
       AND notification_seen = false
       ORDER BY id DESC
       LIMIT 1`,
      [employeeId]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching leave notification:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/leaves/:id/notification-seen', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE leaves
       SET notification_seen = true
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Notification marked as seen' });
  } catch (error) {
    console.error('Error updating leave notification:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/employees/:employeeId/tasks', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await pool.query(
      `SELECT
        tasks.*,
        users.name AS employee_name
       FROM tasks
       JOIN users ON tasks.employee_id = users.id
       WHERE tasks.employee_id = $1
       ORDER BY tasks.id DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/employees/:employeeId/leaves', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await pool.query(
      `SELECT
        leaves.*,
        users.name AS employee_name
       FROM leaves
       JOIN users ON leaves.employee_id = users.id
       WHERE leaves.employee_id = $1
       ORDER BY leaves.id DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/employees/:id/review-notifications', async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(

      `
      SELECT
          id,
          task_name,
          review_comment,
          priority,
          reviewed_at

      FROM tasks

      WHERE employee_id = $1
      AND status = 'Reviewed'
      AND review_seen = FALSE

      ORDER BY reviewed_at DESC
      `,

      [id]

    );

    res.json(result.rows);

  }

  catch(err){

    console.error(err);

    res.status(500).json({

      error: err.message

    });

  }

});

app.put('/tasks/:id/review-seen', async (req, res) => {

  try {

    const { id } = req.params;

    await pool.query(

      `
      UPDATE tasks
      SET review_seen = TRUE
      WHERE id = $1
      `,

      [id]

    );

    res.json({

      success: true

    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({

      error: err.message

    });

  }

});
