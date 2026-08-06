import { sequelize } from "../database/sequelize";
import { Role } from "./role.model";
import { User } from "./user.model";
import { Permission } from "./permission.model";
import { Attendance } from "./attendance.model";
import { AttendanceCorrectionRequest } from "./attendance-correction-request.model";

Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

User.hasMany(Permission, { foreignKey: "userId", as: "permissions" });
Permission.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Attendance, { foreignKey: "userId", as: "attendances" });
Attendance.belongsTo(User, { foreignKey: "userId", as: "user" });

Attendance.hasMany(AttendanceCorrectionRequest, { foreignKey: "attendanceId", as: "correctionRequests" });
AttendanceCorrectionRequest.belongsTo(Attendance, { foreignKey: "attendanceId", as: "attendance" });

User.hasMany(AttendanceCorrectionRequest, { foreignKey: "userId", as: "correctionRequests" });
AttendanceCorrectionRequest.belongsTo(User, { foreignKey: "userId", as: "requester" });

AttendanceCorrectionRequest.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer" });

export { sequelize, Role, User, Permission, Attendance, AttendanceCorrectionRequest };
