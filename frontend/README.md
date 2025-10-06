# 🎨 FileVault Frontend

A modern React frontend for the FileVault secure file storage API, built with **React**, **TypeScript**, **TailwindCSS**, and **ShadCN/UI**.

## 🚀 Quick Setup

### **Option 1: Automatic Setup (Recommended)**
```bash
# Run the setup script from the root directory
./setup-frontend.sh
```

### **Option 2: Manual Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm start
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── ui/            # ShadCN/UI components
│   │   ├── auth/          # Authentication components
│   │   ├── files/         # File management components
│   │   └── layout/        # Layout components
│   ├── pages/             # React pages/routes
│   ├── services/          # API service layer
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── lib/               # Library configurations
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # TailwindCSS configuration
└── components.json        # ShadCN/UI configuration
```

## 🛠️ Tech Stack

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS
- **ShadCN/UI** - Beautiful UI components
- **React Router** - Client-side routing
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

## 🎯 Features Implemented

### ✅ **Ready Components:**
- ✅ Authentication flow (Login/Register)
- ✅ Protected routes
- ✅ API service layer
- ✅ TypeScript types
- ✅ Responsive layout
- ✅ Dark/Light mode support
- ✅ Form validation
- ✅ Error handling
- ✅ Toast notifications

### 🚧 **Components to Complete:**
- 🚧 File upload interface
- 🚧 File management dashboard
- 🚧 User settings page
- 🚧 File sharing modal
- 🚧 Progress indicators
- 🚧 File preview
- 🚧 Search and filters

## 📝 Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_APP_NAME=FileVault
```

## 🎨 Adding ShadCN/UI Components

You can add new ShadCN components as needed:

```bash
# Add specific components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog

# Add all components at once
npx shadcn-ui@latest add --all
```

## 🔧 Development Commands

```bash
# Start development server (runs on port 3001)
npm start

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

## 🎯 Key Features to Implement

### **1. File Upload Interface**
```tsx
// Drag & drop file upload with progress
<FileUpload 
  onUpload={handleFileUpload}
  maxSize="5GB"
  acceptedTypes={['image/*', 'document/*']}
/>
```

### **2. File Management Table**
```tsx
// Data table with sorting, filtering, pagination
<FileTable 
  files={userFiles}
  onDownload={handleDownload}
  onDelete={handleDelete}
  onShare={handleShare}
/>
```

### **3. Dashboard Cards**
```tsx
// Storage usage, recent files, activity
<StatsCard title="Storage Used" value="2.4 GB" />
<RecentFiles files={recentFiles} />
<ActivityFeed activities={activities} />
```

## 🔗 API Integration

The frontend connects to your FileVault API:

```typescript
// Authentication
await authService.login({ email, password })
await authService.register({ name, email, password })

// File operations
await fileService.uploadAuthenticated(file)
await fileService.getUserFiles(page, limit)
await fileService.getDownloadLink(fileId)
await fileService.deleteFile(fileId)
```

## 🎨 Styling Guidelines

- **Primary Colors**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Dark Mode**: Automatic support via ShadCN

## 📱 Responsive Design

- **Mobile First**: Designed for mobile-first approach
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Touch Friendly**: Large tap targets for mobile

## 🚀 Deployment

```bash
# Build for production
npm run build

# The build folder contains optimized files
# Deploy the contents to your web server
```

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow ShadCN/UI component patterns
4. Add proper error handling
5. Include responsive design
6. Test on mobile devices

## 📞 Support

For issues with the frontend setup:
- Check the browser console for errors
- Ensure the backend API is running on port 3000
- Verify environment variables are set correctly
- Check that all dependencies are installed

---

**Happy Coding! 🎉**