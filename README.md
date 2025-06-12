# e-commerce-cosmetic-server

<div align="center">
  <a href="https://nodejs.org/"><img src="https://cdn.worldvectorlogo.com/logos/nodejs-icon.svg" alt="Node.js" height="40"/></a>
  <a href="https://expressjs.com/"><img src="https://cdn.worldvectorlogo.com/logos/express-109.svg" alt="Express" height="40"/></a>
  <a href="https://www.mongodb.com/"><img src="https://cdn.worldvectorlogo.com/logos/mongodb-icon-1.svg" alt="MongoDB" height="40"/></a>
</div>

## Description

This is the **backend** API server for the E-Commerce Cosmetic project. It handles data storage, business logic, and API endpoints for the cosmetic e-commerce platform.

## Features

- RESTful API for products, users, and orders
- User authentication and authorization
- Product management (CRUD)
- Order processing
- MongoDB database integration

## Tech Stack

- **Node.js**, **Express.js**
- **MongoDB** (with Mongoose)
- **JavaScript**

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (local or cloud)

### Steps

```sh
git clone https://github.com/yunusemrekoyun/e-commerce-cosmetic-server.git
cd e-commerce-cosmetic-server
npm install
```

- Create a `.env` file in the root directory with your configuration:
  ```
  MONGO_URI=your_mongodb_connection_string
  JWT_SECRET=your_jwt_secret
  ```

- Start the server:
  ```sh
  npm run start
  ```

## Usage

- The API will be running at [http://localhost:5000](http://localhost:5000) (or as specified in your config).
- Connect your client app to this server using the API URL.

## License

This project is open-source and free to use.

## Author

Developed by [yunusemrekoyun](https://github.com/yunusemrekoyun) and [yigitcanozsahin](https://github.com/Yigitcanozsahin)
