from functools import wraps
from rest_framework.exceptions import PermissionDenied

def role_required(allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")
                
            if request.user.role not in allowed_roles:
                raise PermissionDenied(f"Role {request.user.role} not allowed to perform this action")
                
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator

# Usage examples:
admin_required = role_required(['admin'])
staff_or_admin_required = role_required(['admin', 'staff'])
trainer_or_higher_required = role_required(['admin', 'staff', 'trainer'])
member_or_higher_required = role_required(['admin', 'staff', 'trainer', 'member'])
