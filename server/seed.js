const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'sri',
  host: 'localhost',
  database: 'usermanagement',
  password: 'Taxsale!',
  port: 5432,
});

const saltRounds = 10;

async function seedDatabase() {
  // Connect to the database
  const client = await pool.connect();

  try {
    // Drop the existing users table
    // await client.query('DROP TABLE IF EXISTS users;');

    // Create the users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        middle_name VARCHAR(255),
        last_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        mfa_secret VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT FALSE,
        phone_number VARCHAR(15),
        street_address VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(2),
        zip VARCHAR(10)
      );
    `);

    console.log('Users table created.');

    // Define user details
    const firstName = 'John';
    const middleName = 'Doe';
    const lastName = 'Smith';
    const username = 'johnsmith';
    const email = 'johnsmith@example.com';
    const plainPassword = 'johnpassword';  // This should be a strong password in a real-world scenario
    const phoneNumber = '123-456-7890';
    const streetAddress = '123 Main St';
    const city = 'Springfield';
    const state = 'IL';
    const zip = '12345';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Insert the user into the database
    const queryString = `
      INSERT INTO users 
      (first_name, middle_name, last_name, username, email, password, phone_number, street_address, city, state, zip)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
    `;
    const values = [firstName, middleName, lastName, username, email, hashedPassword, phoneNumber, streetAddress, city, state, zip];
    await client.query(queryString, values);

    console.log('User seeded successfully.');

  } catch (error) {
    console.error('Error seeding the database:', error);
  } finally {
    client.release();
    pool.end();  // Close the pool and end the connection
  }
}

seedDatabase();
