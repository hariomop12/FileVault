const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authenticated user.",
      });
    }

    const role = user.role || "USER";

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to perform this action.",
        requiredRoles: allowedRoles,
        yourRole: role,
      });
    }

    next();
  };
};

module.exports = { requireRole };
