from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_role()


class IsStaffOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.is_admin_role() or request.user.is_staff_role()


class IsTrainerOrHigher(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_admin_role()
            or request.user.is_staff_role()
            or request.user.is_trainer_role()
        )


class IsMemberOrHigher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated


class ReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class IsOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        # Admin and staff can access any object
        if request.user.is_admin_role() or request.user.is_staff_role():
            return True

        # For member objects, check if the user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'member'):
            return obj.member.user == request.user

        return False
