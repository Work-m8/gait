
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { gitAgent } from './agents/git-agent';

export const mastra = new Mastra({
  workflows: {},
  agents: {  gitAgent },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
