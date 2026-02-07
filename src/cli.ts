#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { loadConfig, createDefaultConfig, saveConfig } from "./config/config.js";
import { createCatalyst } from "./gateway/catalyst.js";

const program = new Command();

program
  .name("opencatalyst")
  .description("AI-powered ecommerce assistant for WhatsApp, Email, and Chat")
  .version("0.1.0");

program
  .command("start")
  .description("Start the OpenCatalyst gateway")
  .option("-c, --config <path>", "Path to configuration file")
  .option("-p, --port <number>", "Port to listen on", parseInt)
  .action(async (options) => {
    console.log(chalk.cyan("\n🚀 Starting OpenCatalyst...\n"));

    try {
      const config = loadConfig(options.config);
      if (options.port) config.gateway.port = options.port;

      const catalyst = createCatalyst({
        config,
        onMessage: (msg) => console.log(chalk.dim(`[${msg.channel}] ${msg.from}: ${msg.text}`)),
        onError: (err) => console.error(chalk.red(`Error: ${err.message}`)),
      });

      catalyst.start();
    } catch (error) {
      console.error(chalk.red(`Failed to start: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Initialize a new OpenCatalyst project")
  .option("-n, --name <name>", "Store name")
  .option("-p, --platform <platform>", "Platform (shopify, woocommerce, medusa)")
  .action(async (options) => {
    console.log(chalk.cyan("\n✨ Initializing OpenCatalyst...\n"));

    const storeName = options.name || "My Store";
    const platform = options.platform || "shopify";

    const config = createDefaultConfig(storeName, platform);
    saveConfig(config);

    const catalystDir = path.join(process.cwd(), ".catalyst");
    if (!fs.existsSync(catalystDir)) {
      fs.mkdirSync(catalystDir, { recursive: true });
    }

    console.log(chalk.green("✅ Project initialized!"));
    console.log(chalk.dim("\nCreated: catalyst.config.json, .catalyst/"));
    console.log(chalk.yellow("\n📝 Next steps:"));
    console.log(chalk.dim("  1. Add your API keys to the config"));
    console.log(chalk.dim("  2. Run 'opencatalyst start' to start the gateway\n"));
  });

program
  .command("status")
  .description("Show OpenCatalyst status")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);

      console.log(chalk.cyan("\n📊 OpenCatalyst Status\n"));
      console.log(chalk.bold("Store:"), config.store.name, `(${config.store.platform})`);
      console.log(chalk.bold("AI:"), config.ai.provider, "-", config.ai.model);
      console.log(chalk.bold("Agent:"), config.agent.name);
      console.log(chalk.bold("Port:"), config.gateway.port);
      console.log(chalk.bold("Channels:"));
      console.log("  WhatsApp:", config.channels.whatsapp?.enabled ? chalk.green("✓") : chalk.red("✗"));
      console.log("  Email:", config.channels.email?.enabled ? chalk.green("✓") : chalk.red("✗"));
      console.log("  Web Chat:", config.channels.webchat?.enabled ? chalk.green("✓") : chalk.red("✗"));
      console.log();
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      console.log(chalk.yellow("\nRun 'opencatalyst init' to create a config.\n"));
      process.exit(1);
    }
  });

program
  .command("chat")
  .description("Start an interactive chat session for testing")
  .option("-c, --config <path>", "Path to configuration file")
  .action(async (options) => {
    const readline = await import("node:readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      const config = loadConfig(options.config);

      console.log(chalk.cyan(`\n💬 Chat with ${config.agent.name}\n`));
      console.log(chalk.dim("Type 'exit' to quit\n"));

      const { CustomerAgent } = await import("./agents/customer.js");
      const { MemoryStore } = await import("./memory/store.js");

      const memory = new MemoryStore(config.memory);
      const agent = new CustomerAgent(config, memory);

      console.log(chalk.green(`${config.agent.name}: ${config.agent.greeting}\n`));

      const prompt = (): void => {
        rl.question(chalk.blue("You: "), async (input) => {
          const text = input.trim();
          if (text.toLowerCase() === "exit") {
            console.log(chalk.dim("\nGoodbye! 👋\n"));
            rl.close();
            process.exit(0);
          }
          if (!text) { prompt(); return; }

          try {
            const response = await agent.handleMessage({
              channel: "webchat",
              from: "cli-user",
              text,
              timestamp: new Date(),
            });
            console.log(chalk.green(`\n${config.agent.name}: ${response.text}\n`));
          } catch (error) {
            console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
          }
          prompt();
        });
      };

      prompt();
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      rl.close();
      process.exit(1);
    }
  });

program.parse();
