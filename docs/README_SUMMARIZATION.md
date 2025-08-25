# Message Summarization System

## Overview

The message summarization system automatically summarizes long messages to reduce database storage and token usage. This is particularly useful for maintaining conversation context while minimizing costs and storage requirements.

## How It Works

### Automatic Summarization

- **Threshold**: Messages longer than 2000 characters are automatically summarized
- **Summary Length**: Summaries are limited to 500 characters
- **Smart Truncation**: Takes the first and last parts of the message, preserving complete sentences
- **Token Savings**: Significantly reduces token count for long messages

### Summarization Process

1. **Length Check**: Messages exceeding the threshold are flagged for summarization
2. **Content Analysis**: First and last portions are extracted, maintaining sentence boundaries
3. **Summary Creation**: Combines parts with "... [summarized] ..." indicator
4. **Storage**: Only the summary is stored, saving database space and tokens

## Configuration

### Default Settings

```typescript
MESSAGE_SUMMARY_THRESHOLD = 2000; // Characters threshold
SUMMARY_MAX_LENGTH = 500; // Maximum summary length
```

### Updating Settings

```typescript
// Get current settings
const settings = contextManager.getSummarizationSettings();

// Update settings
contextManager.updateSummarizationSettings(1500, 400);
```

## Usage Examples

### Testing the System

```typescript
// Test summarization functionality
await contextManager.testSummarization();

// Get summary statistics
const stats = await contextManager.getSummaryStatistics();
console.log(`Summarized ${stats.summarizedMessages} messages`);
console.log(`Saved approximately ${stats.savedTokens} tokens`);
```

### Manual Summarization

```typescript
// Summarize existing long messages
const result = await contextManager.summarizeExistingMessages();
console.log(`Summarized ${result.summarized} messages`);
console.log(`Saved ${result.savedTokens} tokens`);
```

### Message Retrieval

```typescript
// Get full message content (summary if message was summarized)
const content = await contextManager.getMessageFullContent(messageId);
```

## Benefits

### Token Savings

- **Long Messages**: 2000+ character messages can save 1000+ tokens
- **Database Storage**: Reduced storage requirements
- **Memory Usage**: Lower memory footprint for conversation context

### Conversation Quality

- **Context Preservation**: Key information is maintained in summaries
- **Readability**: Summaries are more concise and focused
- **Performance**: Faster loading and processing of conversations

## Technical Details

### Message Structure

```typescript
interface StoredMessage {
  role: "user" | "assistant";
  content: string; // Summary if message was summarized
  summary?: string; // Summary content (same as content if summarized)
  timestamp: Date;
  tokenCount: number; // Token count of stored content
  isSummarized: boolean; // Flag indicating summarization status
}
```

### Summarization Algorithm

1. **Length Check**: Compare message length against threshold
2. **Split Calculation**: Determine split points for first/last portions
3. **Sentence Boundary Detection**: Find complete sentence endings
4. **Summary Assembly**: Combine parts with separator text

### Token Estimation

- **Formula**: `Math.ceil(text.length / 4)` (4 characters ≈ 1 token)
- **Accuracy**: Approximate but effective for storage planning
- **Consistency**: Same method used throughout the system

## Best Practices

### When to Use

- **Long Conversations**: Conversations with many messages
- **Token-Limited Systems**: When working with API token limits
- **Storage Constraints**: When database storage is limited
- **Performance Requirements**: When faster loading is needed

### Configuration Tips

- **Threshold**: Set based on your typical message length
- **Summary Length**: Balance between brevity and information retention
- **Testing**: Use `testSummarization()` to verify settings

## Troubleshooting

### Common Issues

1. **Messages Not Summarized**: Check threshold settings
2. **Summary Too Long**: Adjust `SUMMARY_MAX_LENGTH`
3. **Information Loss**: Review threshold and summary length settings

### Debug Information

```typescript
// Enable detailed logging
console.log("📝 Message summarization system is active");

// Check current settings
const settings = contextManager.getSummarizationSettings();
console.log("Current settings:", settings);

// Test functionality
await contextManager.testSummarization();
```

## Future Enhancements

### Planned Features

- **AI-Powered Summarization**: More intelligent content extraction
- **Configurable Algorithms**: Multiple summarization strategies
- **Content Type Detection**: Different handling for code, text, etc.
- **Compression Options**: Additional storage optimization methods

### Customization

- **Plugin System**: Custom summarization algorithms
- **Content Filters**: Selective summarization rules
- **Quality Metrics**: Summarization effectiveness tracking
