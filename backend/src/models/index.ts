import { sequelize } from "../database/sequelize";
import { Role } from "./role.model";
import { User } from "./user.model";

Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

export { sequelize, Role, User };
