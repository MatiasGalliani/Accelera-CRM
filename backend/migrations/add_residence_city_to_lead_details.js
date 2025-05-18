export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('lead_details', 'residence_city', {
    type: Sequelize.STRING(100),
    allowNull: true
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('lead_details', 'residence_city');
} 