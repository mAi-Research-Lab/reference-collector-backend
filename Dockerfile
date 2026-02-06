
# ---- production stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && \
    npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

# Create uploads directory
RUN mkdir -p uploads/avatars

# Expose port
EXPOSE 4001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4001

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
