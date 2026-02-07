#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { loadConfig } from '../config/loader.js';
import { getAvailableSkills } from '../skills/index.js';

const program = new Command();

program
  .name('opencatalyst')
  .description('AI assistant for ecommerce brands')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize OpenCatalyst in the current directory')
  .option('-p, --platform <platform>', 'Store platform (shopify/medusa/woocommerce)', 'shopify')
  .option('-n, --name <name>', 'Store name', 'My Store')
  .action(async (options) => {
    if (existsSync('opencatalyst.yaml')) {
      console.log('⚠️  opencatalyst.yaml already exists');
      return;
    }
    
    const config = `# OpenCatalyst Configuration
name: "${options.name}"
model: claude-sonnet-4  # or gpt-4o, gemini-pro

stores:
  - name: ${options.name.toLowerCase().replace(/\s+/g, '-')}
    platform: ${options.platform}
    url: https://your-store-url.com
    apiKey: \${STORE_API_KEY}  # Set in .env

channels:
  - type: webchat
    enabled: true
    config: {}
  
  # Uncomment to enable Slack
  # - type: slack
  #   enabled: true
  #   config:
  #     botToken: \${SLACK_BOT_TOKEN}

skills:
  - order-lookup
  - customer-support
  - inventory-alerts
  - sales-insights
  - product-search

workflows: []
`;
    
    writeFileSync('opencatalyst.yaml', config);
    console.log('✅ Created opencatalyst.yaml');
    console.log('\nNext steps:');
    console.log('1. Edit opencatalyst.yaml with your store details');
    console.log('2. Set ANTHROPIC_API_KEY and STORE_API_KEY in .env');
    console.log('3. Run: opencatalyst start');
  });

program
  .command('start')
  .description('Start the OpenCatalyst gateway')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-w, --watch', 'Watch for changes (development)')
  .action(async (options) => {
    console.log('🚀 Starting OpenCatalyst...');
    
    const args = options.watch 
      ? ['run', 'dev']
      : ['run', 'start'];
    
    const child = spawn('npm', args, {
      stdio: 'inherit',
      env: { ...process.env, PORT: options.port },
    });
    
    child.on('error', (err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const config = await loadConfig();
      console.log('\n📦 OpenCatalyst Configuration\n');
      console.log(`Name: ${config.name}`);
      console.log(`Model: ${config.model}`);
      console.log(`\nStores (${config.stores.length}):`);
      for (const store of config.stores) {
        console.log(`  • ${store.name} (${store.platform}) - ${store.url}`);
      }
      console.log(`\nChannels (${config.channels.length}):`);
      for (const channel of config.channels) {
        console.log(`  • ${channel.type} (${channel.enabled ? 'enabled' : 'disabled'})`);
      }
      console.log(`\nSkills: ${config.skills.join(', ')}`);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  });

program
  .command('skills')
  .description('List available skills')
  .action(() => {
    console.log('\n🛠️  Available Skills\n');
    for (const skill of getAvailableSkills()) {
      console.log(`  • ${skill}`);
    }
    console.log('\nAdd skills to your opencatalyst.yaml:');
    console.log('  skills:');
    console.log('    - order-lookup');
    console.log('    - customer-support');
  });

program
  .command('ask <message>')
  .description('Ask the assistant a question')
  .option('-u, --url <url>', 'Gateway URL', 'http://localhost:3000')
  .action(async (message, options) => {
    try {
      const response = await fetch(`${options.url}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json() as { response: string };
      console.log('\n' + data.response + '\n');
    } catch (error) {
      console.error('Failed to connect. Is the gateway running? (opencatalyst start)');
    }
  });

program
  .command('chat')
  .description('Start an interactive chat session')
  .option('-u, --url <url>', 'Gateway URL', 'http://localhost:3000')
  .action(async (options) => {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const sessionId = crypto.randomUUID();
    console.log('\n🤖 OpenCatalyst Chat (type "exit" to quit)\n');
    
    const askQuestion = () => {
      rl.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('Goodbye! 👋');
          rl.close();
          return;
        }
        
        try {
          const response = await fetch(`${options.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, sessionId }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json() as { response: string };
          console.log(`\nAssistant: ${data.response}\n`);
        } catch (error) {
          console.log('\n❌ Failed to get response. Is the gateway running?\n');
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  });

program.parse();
