# StagePass — Event Ticketing & Management Platform

A full-stack web app for discovering events, selecting seats, and buying tickets — with a
separate surface for organizers to create and manage their events.

> Heads-up: this repo was bootstrapped with an AI app builder; this README replaces the
> generated placeholder. Update the details below as the project evolves.

## Features

**For attendees**
- Browse events and view event details
- Interactive seat selection
- Checkout with online payment, and a payment-return / confirmation flow
- Account registration and login
- Personal dashboard

**For organizers / admins**
- Create and edit events (`Organize`, `OrganizeNew`, `OrganizeUpgrade`)
- Admin panel for management
- Organizer dashboard

## Tech stack

- **Frontend** — React (Vite), Tailwind CSS, Radix UI / shadcn-style components,
  TanStack Query, React Hook Form, `react-three-fiber` for 3D, Axios. Dark, "cinematic"
  visual theme (see `design_guidelines.json`).
- **Backend** — Python API (`backend/`)
- **Layout** — `frontend/` (client) and `backend/` (API)

## Run locally

```bash
# Frontend
cd frontend
npm install
npm start

# Backend (in a separate terminal)
cd backend
pip install -r requirements.txt
# start the API per backend/ entrypoint
```

## Status

Work in progress. Pages implemented include Landing, Login/Register, Events, Event detail,
Seat selection, Checkout, Payment return, Organize (create/edit/upgrade), Dashboard, and Admin.
