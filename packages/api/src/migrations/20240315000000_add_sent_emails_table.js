"use strict";
const { UUID } = require("sequelize");

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("sent_emails", {
            id: {
                primaryKey: true,
                unique: true,
                type: UUID,
                allowNull: false,
                defaultValue: Sequelize.literal("uuid_generate_v4()"),
            },
            emailId: {
                type: UUID,
                references: {
                    model: "emails",
                    key: "id",
                },
                allowNull: false,
            },
            productUserId: {
                type: UUID,
                references: {
                    model: "product_users",
                    key: "id",
                },
                allowNull: false,
            },
            deliveredAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            erroredAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            error: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            deliveryStatus: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("now()"),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("now()"),
            },
        });

        // Add indexes for performance
        await queryInterface.addIndex("sent_emails", ["createdAt"]);
        await queryInterface.addIndex("sent_emails", ["emailId"]);
        await queryInterface.addIndex("sent_emails", ["productUserId"]);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable("sent_emails");
    },
}; 