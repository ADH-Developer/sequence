import { Optional } from "sequelize";
import { Column, Model, Table, DataType, BeforeCreate, BeforeUpdate } from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";
import { hash } from "src/utils/password";

export interface UserAttributes {
  id: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  photo: string;
  onboardedAt: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "firstName" | "lastName" | "photo" | "password" | "onboardedAt"
>;

@Table({
  tableName: "users",
  paranoid: true,
  defaultScope: {
    attributes: { exclude: ["password"] },
  }
})
export class User extends Model<UserAttributes, UserCreationAttributes> {
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: () => uuidv4(),
  })
  id!: string;

  @Column(DataType.STRING)
  firstName!: string;

  @Column(DataType.STRING)
  lastName!: string;

  @Column(DataType.STRING)
  password!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
  })
  email!: string;

  @Column(DataType.STRING)
  photo!: string;

  @Column(DataType.DATE)
  onboardedAt!: Date;

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User) {
    if (instance.changed('password')) {
      instance.password = await hash(instance.password);
    }
  }

  toJSON() {
    const attributes = Object.assign({}, this.get());
    delete attributes.password;
    return attributes;
  }
}
