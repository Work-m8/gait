import { openai } from '@ai-sdk/openai';
import { LanguageModelV2 } from '@ai-sdk/provider-v5';

import { createOllama } from 'ai-sdk-ollama';
import { LlmProvider } from '../../config/config.manager';





export const getModel = (config: LlmProvider): LanguageModelV2 => {
    if (config.type === 'OLLAMA') {
        const ollama = createOllama({
            baseURL: config.url
        });
        return ollama(config.model);
    } else {
        return openai(config.model);
    }
}