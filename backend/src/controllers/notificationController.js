const pool = require('../db/pool');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const userType = role;

    const result = await pool.query(
      `SELECT * FROM notification
       WHERE user_type = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [userType, id]
    );

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({ success: true, notifications: result.rows, unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const { id: notifId } = req.params;
    const { role, id } = req.user;
    const result = await pool.query(
      'UPDATE notification SET is_read = true WHERE notification_id = $1 AND user_type = $2 AND user_id = $3 RETURNING notification_id',
      [notifId, role, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/mark-all-read
const markAllRead = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    await pool.query(
      'UPDATE notification SET is_read = true WHERE user_type = $1 AND user_id = $2',
      [role, id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
