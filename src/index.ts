#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { GitManager } from './git/git-manager';
import { CommitMessageGenerator } from './git/commit-generator';

import { createGitAgent } from './mastra/agents/git-agent';
import { CommitFormat } from './git/commit-format';
import { commitCommand, generateCommand, statusCommand } from './commands/git';
import { configCommand } from './commands/config';

// Load environment variables
dotenv.config();

const GAIT_TITLE = `
 ██████╗  █████╗ ██╗████████╗
 ██╔════╝ ██╔══██╗██║╚══██╔══╝
 ██║  ███╗███████║██║   ██║   
 ██║   ██║██╔══██║██║   ██║   
 ╚██████╔╝██║  ██║██║   ██║   
  ╚═════╝ ╚═╝  ╚═╝╚═╝   ╚═╝`

const BANNER = `
 . ...      .              ..... .                      ..... .                    .
    ....  ................... ..    ....... ......  ....... .  . ................ ..
  .......... ..  ............... .. .............          .      ...... ...........
   ...... .      ..........      ............. .. ..      .  .. ...   . ............
    ...   .  .. .........            .    ....      .......:-:...:.  .. .......... .
  ....  ..      .......    ......-+#*++===++**=...:-.::-+==*+=--*=:.... ........ ...
. ......... .........  .....-**=-::::::::-=::-:=*=:=-==:-++++++-..:.................
  ....  . ......     ...:+*=::::-+*+---::::====+-*:-+++++--=====... ............ . .
  .... ........  . ...**:::-:=++-=-:-::-:-++:*:-+=+#-:::-=*:... .......... ....... .
  ............... .-#-::::+++-**++=::::-=*:-*=+*----+#*++=:...................  ..  
  ........ ..  ..-*-:::=-*==+*++#+-:::::+-+*===***+****+::...  ..      ... .....    
  .........  ..:*=::::++-==+-=+=--::::-+#*=====+++=====-*:.........        .... ..  
........ .  ..=*-::--+-+-*=:-*+::::-=*##+==========+++***#*#****#**+=-:.....      ..
  .......  ..=+=-::+=+-***++*=::-##+#+=====++*###=:::::::::::::=*+-::::::+#*:...  ..
........   .-*===::*-+*==**--**+==#+==++##+-:::::::::::--+-::::::::---------==*-. ..
  .......  .+-=+=::==*=-+##+======+*#+-:::::::-=-:::::::::----=+*##***+++++===*-. ..
  .....    .*-===-:+**##+=====+*#*-:::-::::::::::-:---=++*##*#*+++*****+====+*:.. ..
......     .*-===-+*#*=====+#*-:::::::=-::::::--==*###*+===**+===+***#====+#-.   ...
  .......  .*-===*#====++#+:::--:::::::-:---=#%*=-=##*****###****#%*====+#:.... ... 
 .......   .+==#**+=+*#+::::::*::::::--=*#*=-::.....::-====++====--**+#+..  ..  ....
  ..........-#*+**+#+-:-::::::=::--+*#+=-:..................::::::::=#.  . ..... ...
  ......  . .%++*#-:::-=:::::--=*#+=-::.::-=-.............#%%#=-:::::-#-.     ..  ..
........   ..-##::::::+:::-=+#*=-::::::+%%#+:................:*#:::::::#:.  .   ..  
.   ..    ..:#::=-:::::-=*#+=-:::::::::::.......................:::::::-%: .  .. ...
   ...  . .*=::-=:::-=*#+=-:::::::::::...:+*=..............:+##:.:::::::=+ ...      
   ..   .:+::::+:--+#+==-:::::::::::::..-+.:@%:...........-+.:%@-::::::::*: ....  ..
        -+:+:::-=#*==-=--:::::::::::::..%-.=@@*...........+@=%@@*::::::::+*.. ....  
 ..   .-+:=::=+%*%--===--::::::::::::..:@@@@=%#:..........=@@@-**::::::::=%.   .    
  .  .-+::=-*#+=**-====--:::::::::::::..#@@@#@#......::....*@@@@-::---:::-%. .......
.....:*::-*#+===**-====--:::::::::----:::#@@@@:......::.....-++::======-:=%..    ...
    .#:-+#+=====*#-=====-::::::-========-::-:...........::....::-=======-++.....    
    -=-#*=======+%======-::::::==========::.......-#-::=*....:::-======-:#.     .  .
    =-#+=========*=======-:::::==========::::::.::..::::::::::::::--=--:++ ..       
    :#*++++++**#*+#-=====--:::::-======-:::::::::::::::::::::::::::::::=#. . .....  
....  .......    .:#-======--:::::::::::::::::::::::::::::::::::::::::=*..  .... ...
            ....  .:#--=====--::::::::::::::::::::::::::::::::::::::-*+.   ....  .  
   .....  ......   ..*+-======--::::::::::::::::::::::::::::::::::-+%:.     ....   .
........  . ..... ....:#+-======---::::::::::::::::::::::::::::--+#-.  .. ....... ..
  ..... ....   ....   ..:+*=--==-==----:::::::::::::::::::----=**:.       ...... ...
 .........  .........  .. .-**+=====-===------------------=+#*-.     .   .   ...... 
....  ....  ..... ...... .. ...-*#*+====-====-----====+*#*:.        ...  . .........
  ....       . ..   ..... .... . .....:=+*##%%##*+=:.....        .....  .  . .......
........       .   ...................  ....     ....      ..  .... ...    .......  
  ......         ... ........... .. . . ......  .   .............  .............. ..
    ....... ............... .......... ...........  ................................
...... .................................. ....  ....................................
`;

function displayHelp() {

    console.log(chalk.bold.cyan(GAIT_TITLE));

    console.log(chalk.cyan(BANNER));
    console.log(chalk.bold.white('\n🚶‍♂️ Gait - Your AI-powered Git commit message generator\n'));
    
    console.log(chalk.yellow('Usage:'));
    console.log('  gait <command> [options]\n');
    
    console.log(chalk.yellow('Commands:'));
    console.log('  generate, gen, g    Generate commit message without committing');
    console.log('  commit, c          Generate commit message and create commit');
    console.log('  status, st         Show repository status and changes\n');
    
    console.log(chalk.yellow('Options:'));
    console.log('  -r, --repo <path>  Repository path (default: ".")');
    console.log('  -v, --verbose      Enable verbose output');
    console.log('  --version         Show version number');
    console.log('  --help            Show help\n');
    
    console.log(chalk.yellow('Examples:'));
    console.log('  gait generate                    Generate a conventional commit message');
    console.log('  gait commit --interactive        Generate and review before committing');
    console.log('  gait status --show-diff          Show repository status with diff\n');
    
    console.log(chalk.yellow('Config:'));
    console.log('   gait config                     Manage Configuration');
    
    console.log(chalk.gray('For more information on a specific command, use:'));
    console.log(chalk.gray('  gait <command> --help\n'));
    
    console.log(chalk.green('✨ Powered by AI • Made with ❤️  for clean Git history'));
}

const program = new Command();

program
    .name('gait')
    .description('Gait, your Git Commit message generator')
    .version('1.0.0')
    .option('-r, --repo <path>', 'Repository path', '.')
    .option('-v, --verbose', 'Enable verbose output')
    .addCommand(statusCommand)
    .addCommand(generateCommand)
    .addCommand(commitCommand)
    .addCommand(configCommand)
    ;

program.configureHelp({
    formatHelp: () => {
        displayHelp();
        return '';
    }
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    displayHelp();
}