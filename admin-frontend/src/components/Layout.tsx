import React from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar, Chip, Divider, Menu, MenuItem } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAuth, UserRole } from '../contexts/AuthContext';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

// Define menu items with role access constraints
const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.TRAINER, UserRole.FRONT_DESK]
  },
  { 
    text: 'Members', 
    icon: <PeopleIcon />, 
    path: '/members',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.TRAINER]
  },
  { 
    text: 'Invoices', 
    icon: <ReceiptIcon />, 
    path: '/invoices',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]
  },
  { 
    text: 'Check-ins', 
    icon: <FitnessCenterIcon />, 
    path: '/check-in',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.FRONT_DESK]
  },
  {
    text: 'Admin Panel',
    icon: <AdminPanelSettingsIcon />,
    path: '/admin',
    roles: [UserRole.ADMIN]
  },
  {
    text: 'Notifications',
    icon: <NotificationsActiveIcon />,
    path: '/notifications',
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  },
  {
    text: 'Reports',
    icon: <AssessmentIcon />,
    path: '/reports',
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  }
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const location = useLocation();
  const { user, logout, checkRole } = useAuth();
  
  const isUserMenuOpen = Boolean(userMenuAnchorEl);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };
  
  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    return checkRole(item.roles);
  });

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          AV Gym Admin
        </Typography>
      </Toolbar>
      {user && (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar sx={{ width: 60, height: 60, mb: 1, bgcolor: 'primary.main' }}>
            {user.first_name[0]}{user.last_name[0]}
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {user.first_name} {user.last_name}
          </Typography>
          <Chip 
            label={user.role.replace('_', ' ')} 
            color="primary" 
            size="small" 
            variant="outlined" 
            sx={{ mt: 0.5 }} 
          />
        </Box>
      )}
      <Divider sx={{ my: 1 }} />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListItemButton onClick={handleLogout} sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            AV Gym Management
          </Typography>
          
          {/* User menu */}
          {user && (
            <>
              <IconButton
                onClick={handleUserMenuOpen}
                size="small"
                edge="end"
                color="inherit"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={userMenuAnchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={isUserMenuOpen}
                onClose={handleUserMenuClose}
              >
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  My Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
