#!/bin/bash

echo "🚀 Setting up FileVault Frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file for frontend
echo "⚙️ Creating environment file..."
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3000
REACT_APP_APP_NAME=FileVault
EOF

echo "✅ Frontend setup complete!"
echo ""
echo "🏃‍♂️ To start the development server:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "📱 The app will be available at: http://localhost:3001"