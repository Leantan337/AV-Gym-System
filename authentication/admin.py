from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.shortcuts import render, redirect
from django.urls import path, reverse
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from .models import User
from django.http import HttpResponseRedirect


class ChangeRoleForm(forms.Form):
    _selected_action = forms.CharField(widget=forms.MultipleHiddenInput)
    role = forms.ChoiceField(choices=User.ROLE_CHOICES, label='New role')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (('Role info', {'fields': ('role',)}),)
    add_fieldsets = BaseUserAdmin.add_fieldsets + (('Role info', {'fields': ('role',)}),)

    actions = ['change_role_action']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('change-role/', self.admin_site.admin_view(self.change_role)),
        ]
        return custom_urls + urls

    def change_role_action(self, request, queryset):
        form = None
        if 'apply' in request.POST:
            form = ChangeRoleForm(request.POST)
            if form.is_valid():
                role = form.cleaned_data['role']
                count = queryset.update(role=role)
                self.message_user(request, f"Changed role for {count} users.")
                return HttpResponseRedirect(reverse('admin:authentication_user_changelist'))
        if not form:
            form = ChangeRoleForm(
                initial={'_selected_action': request.POST.getlist(ACTION_CHECKBOX_NAME)}
            )
        return render(
            request,
            'admin/change_role.html',
            {
                'users': queryset,
                'form': form,
                'title': 'Change role for selected users',
                'action_checkbox_name': ACTION_CHECKBOX_NAME,
            },
        )

    change_role_action.short_description = 'Change role for selected users'

    def change_role(self, request):
        user_ids = request.POST.getlist('_selected_action')
        queryset = User.objects.filter(pk__in=user_ids)
        return self.change_role_action(request, queryset)
