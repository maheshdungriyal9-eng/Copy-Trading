# AlgoDelta Clone - Setup Guide

This guide will help you get the multi-account trading dashboard up and running on your local machine.

## Prerequisites

- **Node.js**: v18 or later
- **npm**: v9 or later
- **Supabase Account**: For the database and authentication

## 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `schema.sql` (found in the root or brain folder) and run it to create the necessary tables.
4. Go to **Project Settings > API** and note down your:
   - `Project URL`
   - `service_role` key (for the server)
   - `anon` key (for the client)

## 2. Backend Setup

1. Open a terminal in the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Fill in your Supabase credentials in `.env`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=5000
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## 3. Frontend Setup

1. Open a new terminal in the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=http://localhost:5000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 4. Usage

- Access the dashboard at `http://localhost:5173`.
- The dashboard is fully integrated with **Supabase** for real-time data persistence.
- **Angel One Integration**: Use the Demat module to add your Angel One SmartAPI credentials (Client ID, API Key, TOTP Secret) for automated trading.
- **Watchlist**: Track your favorite symbols with live price updates.
- **Group Execution**: Place high-speed orders across multiple account clusters with quantity multipliers.
- **Audit Logging**: Every action is recorded in the Activity Logs for full transparency.

## System Architecture

- **Frontend**: React + Vite + Tailwind CSS 4.0
- **Backend**: Express + TypeScript + Socket.io
- **Database**: PostgreSQL (Supabase)
