# YearCal SaaS Product Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

A free consumer web app that gives anyone a year-at-a-glance view of their Google or iCloud calendar. No event storage — pure proxy to calendar providers. Revenue via voluntary donations ("buy me a coffee"), with the door open for premium features later.

## Target User

General consumers — anyone who wants a better calendar view. Product must be dead simple and frictionless.

## Architecture

### Current → Product Evolution

- **Current:** Express + React monorepo, single-user, .env credentials, iCloud CalDAV only
- **Product:** Same core, plus auth layer, user DB, Google Calendar API integration, per-user credential storage

### High-Level Flow

```
User → Sign up/Login → Connect Google and/or iCloud →
App fetches calendars live from providers → Year view renders
```

No event caching. Every page load / year change fetches fresh from provider APIs. Optional short TTL in-memory cache (e.g., 60s) to avoid hammering APIs on rapid navigation, but nothing persisted.

## User Accounts & Auth

### Database Schema

```sql
users
  id            UUID (PK)
  email         TEXT (unique)
  password_hash TEXT (nullable — null for social-only users)
  created_at    TIMESTAMP

calendar_connections
  id            UUID (PK)
  user_id       UUID (FK → users)
  provider      ENUM('google', 'icloud')
  -- Google: OAuth tokens
  access_token  TEXT (encrypted)
  refresh_token TEXT (encrypted)
  token_expiry  TIMESTAMP
  -- iCloud: CalDAV credentials
  caldav_user   TEXT (encrypted, nullable)
  caldav_pass   TEXT (encrypted, nullable)
  created_at    TIMESTAMP
```

### Auth Flows

- **Email/password:** bcrypt-hashed passwords, standard signup/login forms
- **Sign in with Google:** OAuth 2.0 — request calendar scopes during sign-in, store tokens. User gets account + calendar access in one step.
- **Sign in with Apple:** Apple Sign In for auth only. iCloud calendar connection is a separate step where user provides Apple ID + app-specific password.

### Sessions

HTTP-only secure cookies with JWT. Stateless, no session table needed.

### Encryption

OAuth tokens and CalDAV credentials encrypted at rest using an application-level encryption key (env var), AES-256.

## Google Calendar Integration

- Use Google Calendar API (REST), not CalDAV — better documented, proper OAuth, structured JSON responses
- OAuth 2.0 scopes: `openid email profile` + `calendar.readonly` + `calendar.events`
- Store access + refresh tokens in `calendar_connections`
- Access tokens refreshed automatically when expired

### API Calls Per Year View Load

1. `GET /calendars` — list user's calendars
2. `GET /calendars/{id}/events?timeMin=...&timeMax=...` — per visible calendar

### iCloud

Stays as current CalDAV/tsdav approach, with per-user credentials instead of single .env.

### Provider Abstraction

`GoogleCalendarProvider` and `ICloudCalendarProvider` implement the same interface. Routes don't care which provider a calendar comes from.

## Frontend Changes

### New Pages

- **Landing page** — explains the product, screenshots, "Sign up free" CTA
- **Sign up / Login** — email+password form, Google/Apple social buttons
- **Settings / Account** — manage connected calendars, add/remove providers, change password, delete account
- **Connect calendar onboarding** — after first sign-up, guide user to connect at least one provider

### Changes to Existing Views

- Minimal — year view, day view, event modal, sidebar all stay the same
- Add user avatar / logout button to toolbar
- Calendar sidebar shows calendars from multiple providers

### Routing

Add react-router:
- `/` — landing page (unauthenticated) or year view (authenticated)
- `/login`, `/signup`
- `/settings`
- `/year/:year` (optional, for bookmarking)

### API Client

- Auth cookie included automatically (HTTP-only)
- Handle 401 → redirect to login

## Infrastructure

### Hosting

Managed platform (Fly.io or Railway):
- Single Node.js service serving API + static files
- Managed Postgres addon for user DB
- Environment variables: encryption key, Google OAuth client ID/secret, Apple Sign In credentials, JWT secret

### Domain & SSL

Custom domain with automatic SSL from hosting platform.

### Security

- Encrypt tokens at rest (AES-256)
- HTTPS everywhere
- CSRF protection on auth endpoints
- Rate limiting on login/signup
- Clear instructions for iCloud app-specific passwords

### Privacy & Legal

- Privacy policy: account info + encrypted tokens stored, never store calendar events, don't sell data
- Terms of service: basic boilerplate
- GDPR: account deletion wipes all data, minimal exposure since no events stored

### Google OAuth Verification

- Required for calendar scopes — 2-4 week review process
- During development: "testing" mode, limited to 100 manually whitelisted users

## What Stays the Same

- The entire calendar UI (year view, transposed view, day view, event modal, sidebar)
- Event CRUD flows (routed through provider abstraction)
- Express + React + TypeScript stack

## Not Needed at Launch

- Email verification
- Password reset flow
- Analytics/monitoring
- CDN
