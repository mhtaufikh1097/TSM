// Startup file for cPanel Node.js deployment
// This file handles port assignment and ensures proper startup

console.log('🚀 Starting WhatsApp Storage API for cPanel...');

// Check if server.js exports an app or starts itself
try {
  const app = require('./server.js');
  
  // If server.js exports an Express app, start it here
  if (app && typeof app.listen === 'function') {
    // Use port assigned by cPanel or system
    const PORT = process.env.PORT || 0; // 0 lets system assign available port
    
    const server = app.listen(PORT, () => {
      const actualPort = server.address().port;
      console.log(`✅ WhatsApp Storage API started on port ${actualPort}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`📡 Base URL: ${process.env.BASE_URL || 'https://botlinko.biz.id/wa'}`);
    });
    
    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Trying different port...`);
        // Try a different port
        const altPort = Math.floor(Math.random() * 10000) + 40000;
        server.listen(altPort, () => {
          console.log(`✅ WhatsApp Storage API started on alternative port ${altPort}`);
        });
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
    
  } else {
    console.log('✅ Server already started by server.js');
  }
  
} catch (error) {
  console.error('❌ Failed to start WhatsApp Storage API:', error);
  process.exit(1);
}
