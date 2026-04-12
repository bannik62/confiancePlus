import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { config } from './config.js'

const SALT_ROUNDS = 12

export const hashPassword  = (password) => bcrypt.hash(password, SALT_ROUNDS)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

export const signToken = (payload) =>
  jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })

export const verifyToken = (token) =>
  jwt.verify(token, config.JWT_SECRET)
