// // components/layout/Sidebar.tsx
import React from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  ListItemButton
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import QcIcon from '@mui/icons-material/CheckCircle';
import ProjectIcon from '@mui/icons-material/Business';
import ListAltIcon from '@mui/icons-material/ListAlt';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  setMobileOpen?: (open: boolean) => void;
  isInspector?: boolean;
  isQc?: boolean;
  isPm?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isMobile, 
  setMobileOpen,
  isInspector,
  isQc,
  isPm
}) => {
  const theme = useTheme();

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
        <ListItem>
          <ListItemButton 
            selected={activeTab === 'dashboard'} 
            onClick={() => {
              setActiveTab('dashboard');
              if (isMobile && setMobileOpen) setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ color: activeTab === 'dashboard' ? theme.palette.primary.main : 'inherit' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Dashboard" 
              primaryTypographyProps={{ 
                fontWeight: activeTab === 'dashboard' ? 'bold' : 'regular' 
              }}
            />
          </ListItemButton>
        </ListItem>
        {isInspector && (
          <ListItem>
            <ListItemButton  
              selected={activeTab === 'inspections'} 
              onClick={() => {
                setActiveTab('inspections');
                if (isMobile && setMobileOpen) setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: activeTab === 'inspections' ? theme.palette.primary.main : 'inherit' }}>
                <AssignmentIcon />
              </ListItemIcon>
              <ListItemText 
                primary="New Inspection" 
                primaryTypographyProps={{ 
                  fontWeight: activeTab === 'inspections' ? 'bold' : 'regular' 
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
        {isQc && (
          <ListItem>
            <ListItemButton  
              selected={activeTab === 'reviews'} 
              onClick={() => {
                setActiveTab('reviews');
                if (isMobile && setMobileOpen) setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: activeTab === 'reviews' ? theme.palette.primary.main : 'inherit' }}>
                <QcIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Review Queue" 
                primaryTypographyProps={{ 
                  fontWeight: activeTab === 'reviews' ? 'bold' : 'regular' 
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
        {isPm && (
          <ListItem>
            <ListItemButton  
              selected={activeTab === 'projects'} 
              onClick={() => {
                setActiveTab('projects');
                if (isMobile && setMobileOpen) setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: activeTab === 'projects' ? theme.palette.primary.main : 'inherit' }}>
                <ProjectIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Projects" 
                primaryTypographyProps={{ 
                  fontWeight: activeTab === 'projects' ? 'bold' : 'regular' 
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem>
          <ListItemButton 
            selected={activeTab === 'all-inspections'} 
            onClick={() => {
              setActiveTab('all-inspections');
              if (isMobile && setMobileOpen) setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ color: activeTab === 'all-inspections' ? theme.palette.primary.main : 'inherit' }}>
              <ListAltIcon />
            </ListItemIcon>
            <ListItemText 
              primary="All Inspections" 
              primaryTypographyProps={{ 
                fontWeight: activeTab === 'all-inspections' ? 'bold' : 'regular' 
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton  
            selected={activeTab === 'history'} 
            onClick={() => {
              setActiveTab('history');
              if (isMobile && setMobileOpen) setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ color: activeTab === 'history' ? theme.palette.primary.main : 'inherit' }}>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText 
              primary="History" 
              primaryTypographyProps={{ 
                fontWeight: activeTab === 'history' ? 'bold' : 'regular' 
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton 
            selected={activeTab === 'settings'} 
            onClick={() => {
              setActiveTab('settings');
              if (isMobile && setMobileOpen) setMobileOpen(false);
            }}
          >
            <ListItemIcon sx={{ color: activeTab === 'settings' ? theme.palette.primary.main : 'inherit' }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Settings" 
              primaryTypographyProps={{ 
                fontWeight: activeTab === 'settings' ? 'bold' : 'regular' 
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      {/* Logout button is handled in AppBar menu, so not needed here */}
    </Box>
  );
};

export default Sidebar;