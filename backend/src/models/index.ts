import { sequelize } from "../database/sequelize";
import { Role } from "./role.model";
import { User } from "./user.model";
import { Permission } from "./permission.model";
import { Attendance } from "./attendance.model";
import { AttendanceCorrectionRequest } from "./attendance-correction-request.model";
import { RefreshToken } from "./refresh-token.model";

Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

Role.hasMany(Permission, { foreignKey: "roleId", as: "permissions" });
Permission.belongsTo(Role, { foreignKey: "roleId", as: "role" });

Permission.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

User.hasMany(Attendance, { foreignKey: "userId", as: "attendances" });
Attendance.belongsTo(User, { foreignKey: "userId", as: "user" });

Attendance.hasMany(AttendanceCorrectionRequest, { foreignKey: "attendanceId", as: "correctionRequests" });
AttendanceCorrectionRequest.belongsTo(Attendance, { foreignKey: "attendanceId", as: "attendance" });

User.hasMany(AttendanceCorrectionRequest, { foreignKey: "userId", as: "correctionRequests" });
AttendanceCorrectionRequest.belongsTo(User, { foreignKey: "userId", as: "requester" });

AttendanceCorrectionRequest.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer" });

User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

export { sequelize, Role, User, Permission, Attendance, AttendanceCorrectionRequest, RefreshToken };
