from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.validators import UniqueValidator
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model with role-based fields."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'phone', 'is_active', 'date_joined', 'last_updated'
        ]
        read_only_fields = ('date_joined', 'last_updated')
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value):
        """Ensure email is unique."""
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users with password."""
    
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this email already exists."
            )
        ]
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'role', 'phone'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': True}
        }

    def validate(self, attrs):
        """Validate that the two password fields match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """Create and return a new user with encrypted password."""
        validated_data.pop('password2', None)
        password = validated_data.pop('password')
        
        try:
            user = User.objects.create_user(
                **validated_data,
                password=password
            )
            return user
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users with optional password change."""
    
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'current_password', 'new_password', 'is_active'
        ]
        read_only_fields = ('username', 'email')

    def validate(self, attrs):
        """Validate password change if new_password is provided."""
        if 'new_password' in attrs and attrs['new_password']:
            if 'current_password' not in attrs or not attrs['current_password']:
                raise serializers.ValidationError({
                    "current_password": "Current password is required to set a new password."
                })
            
            user = self.context['request'].user
            if not user.check_password(attrs['current_password']):
                raise serializers.ValidationError({
                    "current_password": "Current password is incorrect."
                })
        return attrs

    def update(self, instance, validated_data):
        """Update user, handling password change if requested."""
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('current_password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if new password provided
        if new_password:
            instance.set_password(new_password)
        
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer to include user details in the response."""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)
        
        # Add user data to the response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': self.user.role,
            'is_staff': self.user.is_staff,
        }
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        return data


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing password."""
    
    current_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Validate that the new password fields match."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Password fields didn't match."
            })
        return attrs

    def validate_current_password(self, value):
        """Validate current password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""
    
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Validate email format and existence."""
        if not User.objects.filter(email=value, is_active=True).exists():
            # Don't raise error for security reasons, just return the email
            pass
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset."""
    
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Validate that the password fields match."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Password fields didn't match."
            })
        return attrs
