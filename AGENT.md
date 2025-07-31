# AV Gym System - Agent Guide

## Build/Test Commands
- **Django backend tests**: `python manage.py test` or `pytest` (with coverage)
- **Single test**: `pytest members/tests/test_models.py::TestMemberModel::test_create_member`
- **Frontend tests**: `cd admin-frontend && npm test`
- **Frontend lint/type-check**: `cd admin-frontend && npm run lint` and `npm run type-check`
- **Django lint**: `pylint <app_name>/` (max line length: 100, ignores migrations/static)

## Architecture
- **Django 5.0 backend** with REST API, WebSockets (Channels), Celery tasks, PostgreSQL
- **React/TypeScript frontend** (admin-frontend/) with Material-UI, React Query, Axios
- **Apps**: authentication, members, checkins, plans, invoices, notifications, reports
- **Ports**: Backend :8000, Frontend :3000, Admin panel at :8000/admin
- **Database**: PostgreSQL with UUID primary keys, custom User model in authentication app

## Code Style
- **Backend**: Django conventions, PascalCase models, snake_case fields/functions
- **Frontend**: TypeScript strict mode, camelCase, Material-UI components
- **API**: REST endpoints at `/api/`, Bearer token auth (JWT), CSRF protection
- **Imports**: Absolute paths preferred, security utils for sanitization/headers
- **Error handling**: Try/catch with proper HTTP status codes, validation via serializers
- **Testing**: pytest with markers (unit/integration/api), React Testing Library for frontend
