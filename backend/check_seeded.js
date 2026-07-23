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
    const [results] = await sequelize.query("SELECT * FROM MasterFields");
    console.log('Seeded MasterFields in database:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await sequelize.close();
  }
}

main();
