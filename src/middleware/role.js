const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res
        .status(403)
        .json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(', ')}`,
        });
    }
    next();
  };
};

module.exports = role;
