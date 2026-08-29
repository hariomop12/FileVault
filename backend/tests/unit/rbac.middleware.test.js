const { requireRole } = require("../../middlewares/rbac.middleware");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("requireRole (RBAC middleware)", () => {
  let res;
  let next;

  beforeEach(() => {
    res = makeRes();
    next = jest.fn();
  });

  it("returns 401 when there is no authenticated user", () => {
    requireRole("ADMIN")({ user: null }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("denies 403 when user role is not in the allowed list", () => {
    requireRole("ADMIN")({ user: { role: "USER" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows when user role is explicitly allowed", () => {
    requireRole("ADMIN")({ user: { role: "ADMIN" } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows when user role is one of several allowed roles", () => {
    requireRole("USER", "ADMIN")({ user: { role: "USER" } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("treats a missing role as USER by default", () => {
    requireRole("USER")({ user: { id: 1, email: "a@b.c" } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies a missing role for ADMIN-only route", () => {
    requireRole("ADMIN")({ user: { id: 1, email: "a@b.c" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("denies READ_ONLY role from ADMIN routes", () => {
    requireRole("ADMIN")({ user: { role: "READ_ONLY" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
