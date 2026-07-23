import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'thinktech_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

async function main() {
  try {
    console.log('Cleaning up corrupted MasterFields rows...');
    // Delete any rows where module is empty string, or where module is Department/Designation to let them re-seed correctly.
    const [result] = await sequelize.query("DELETE FROM MasterFields WHERE module = '' OR module = 'Department' OR module = 'Designation'");
    console.log('Cleaned up. Rows affected:', result.affectedRows);
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

main();
