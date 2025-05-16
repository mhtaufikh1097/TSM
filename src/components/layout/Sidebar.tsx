// components/layout/Sidebar.tsx
import React from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  Button, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  setMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isMobile, 
  setMobileOpen 
}) => {
  const { logout } = useAuth();
  const theme = useTheme();

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'inspections', text: 'New Inspection', icon: <AssignmentIcon /> },
    { id: 'history', text: 'History', icon: <HistoryIcon /> },
    { id: 'settings', text: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <Box sx={{ bgcolor: theme.palette.background.paper, height: '100%' }}>
      <Box sx={{ py: 2, px: 2, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
          <WhatsAppIcon />
        </Avatar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Inspection App
        </Typography>
      </Box>
      <List sx={{ py: 2 }}>
        {menuItems.map((item) => (
          <ListItem 
            component="li"
            button 
            key={item.id}
            selected={activeTab === item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (isMobile && setMobileOpen) setMobileOpen(false);
            }}
            sx={{
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: `${theme.palette.primary.main}20`,
                '&:hover': {
                  bgcolor: `${theme.palette.primary.main}30`,
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: activeTab === item.id ? theme.palette.primary.main : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ 
                fontWeight: activeTab === item.id ? 'bold' : 'regular' 
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          startIcon={<LogoutIcon />}
          onClick={logout}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;