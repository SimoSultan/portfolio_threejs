# Database Architecture

## Overview

The chatbot system now uses a three-layer architecture for better separation of concerns, maintainability, and extensibility:

1. **Database Manager** (`db-manager.ts`) - Raw database operations
2. **Storage Manager** (`storage-manager.ts`) - Business logic middleware
3. **Context Manager** (`context-manager.ts`) - Chatbot business logic

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Context       │    │   Storage        │    │   Database      │
│   Manager       │◄──►│   Manager        │◄──►│   Manager       │
│                 │    │                  │    │                 │
│ • Chat logic    │    │ • Message CRUD   │    │ • IndexedDB     │
│ • Summarization │    │ • Search         │    │ • localStorage  │
│ • Context       │    │ • Statistics     │    │ • Schema mgmt   │
│   management    │    │ • Cleanup        │    │ • Connection    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Layer Responsibilities

### 1. Database Manager (`db-manager.ts`)

**Purpose**: Handles raw database operations and storage abstraction

**Responsibilities**:

- IndexedDB and localStorage support detection
- Raw data persistence and retrieval
- Database schema management
- Connection testing and health checks
- Storage size estimation
- Cross-browser compatibility

**Key Methods**:

```typescript
class DatabaseManager {
  async saveContext(data: ContextStorage): Promise<void>;
  async loadContext(): Promise<ContextStorage | null>;
  async clearAll(): Promise<void>;
  async testConnection(): Promise<boolean>;
  async getDatabaseStats(): Promise<DatabaseStats>;
}
```

**Features**:

- **Automatic Fallback**: IndexedDB → localStorage
- **Schema Versioning**: Database version 3 with upgrade support
- **Connection Testing**: Automatic health checks
- **Size Monitoring**: Storage usage tracking

### 2. Storage Manager (`storage-manager.ts`)

**Purpose**: Middleware between database and business logic

**Responsibilities**:

- Message CRUD operations
- Search and filtering
- Statistics and analytics
- Data cleanup and maintenance
- Import/export functionality
- Business rule enforcement

**Key Methods**:

```typescript
class StorageManager {
  async addMessage(message: StoredMessage): Promise<void>;
  async searchMessages(query: string): Promise<StoredMessage[]>;
  async getMessagesByRole(role: string): Promise<StoredMessage[]>;
  async getMessagesByDateRange(
    start: Date,
    end: Date
  ): Promise<StoredMessage[]>;
  async cleanupOldMessages(options: CleanupOptions): Promise<CleanupResult>;
  async exportConversation(): Promise<ExportData>;
  async importConversation(data: ImportData): Promise<void>;
}
```

**Features**:

- **Advanced Search**: Content and metadata search
- **Flexible Cleanup**: Multiple cleanup strategies
- **Data Export/Import**: Conversation backup and restore
- **Message Analytics**: Comprehensive statistics
- **Role-based Access**: Filter messages by user/assistant

### 3. Context Manager (`context-manager.ts`)

**Purpose**: High-level chatbot business logic

**Responsibilities**:

- Message summarization
- Context management
- Location services
- Token management
- Conversation flow
- UI integration

**Key Methods**:

```typescript
class ContextManager {
  async addMessage(role: string, content: string): Promise<void>;
  async getConversationMessages(): Promise<StoredMessage[]>;
  async getSummaryStatistics(): Promise<SummaryStats>;
  async summarizeExistingMessages(): Promise<SummarizationResult>;
  async getComprehensiveStats(): Promise<ComprehensiveStats>;
  async advancedCleanup(options: CleanupOptions): Promise<CleanupResult>;
}
```

**Features**:

- **Smart Summarization**: Automatic long message compression
- **Context Awareness**: Date, time, location management
- **Token Optimization**: Efficient storage and retrieval
- **Advanced Analytics**: Combined storage and summarization stats

## Data Flow

### Message Storage Flow

```
User Input → Context Manager → Storage Manager → Database Manager → IndexedDB/localStorage
```

### Message Retrieval Flow

```
IndexedDB/localStorage → Database Manager → Storage Manager → Context Manager → Chatbot UI
```

### Summarization Flow

```
Long Message → Context Manager → Summarization Logic → Storage Manager → Database Manager
```

## Configuration

### Database Settings

```typescript
// Database Manager Configuration
DB_NAME = "PortfolioChat";
DB_VERSION = 3;
STORAGE_KEY = "portfolio_chat_context";
```

### Summarization Settings

```typescript
// Context Manager Configuration
MESSAGE_SUMMARY_THRESHOLD = 2000; // Characters
SUMMARY_MAX_LENGTH = 500; // Characters
MAX_TOKENS = 32000; // Total conversation tokens
MAX_CONVERSATION_LENGTH = 50; // Maximum messages
```

## Usage Examples

### Basic Message Operations

```typescript
// Add a message
await contextManager.addMessage("user", "Hello, how are you?");

// Get conversation
const messages = await contextManager.getConversationMessages();

// Search messages
const results = await contextManager.searchMessages("hello");
```

### Advanced Operations

```typescript
// Get comprehensive statistics
const stats = await contextManager.getComprehensiveStats();
console.log(`Storage: ${stats.storage.database.type}`);
console.log(`Messages: ${stats.storage.messages.totalMessages}`);
console.log(`Summarized: ${stats.summarization.summarizedMessages}`);

// Advanced cleanup
const cleanup = await contextManager.advancedCleanup({
  maxMessages: 100,
  maxTokens: 25000,
  maxAge: 30, // days
  preserveSummarized: true,
});

// Export conversation
const exportData = await contextManager.exportConversation();
```

### Storage Management

```typescript
// Get storage statistics
const storageStats = await storageManager.getStorageStats();

// Clean up old messages
const cleanup = await storageManager.cleanupOldMessages({
  maxMessages: 50,
  maxAge: 7, // days
});

// Search by date range
const weekMessages = await storageManager.getMessagesByDateRange(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  new Date()
);
```

## Benefits of New Architecture

### 1. **Separation of Concerns**

- Database logic isolated from business logic
- Easier testing and debugging
- Clear responsibility boundaries

### 2. **Maintainability**

- Single responsibility principle
- Easier to modify individual components
- Reduced coupling between layers

### 3. **Extensibility**

- Easy to add new storage backends
- Simple to implement new business rules
- Plugin architecture ready

### 4. **Testing**

- Each layer can be tested independently
- Mock implementations for testing
- Better error isolation

### 5. **Performance**

- Optimized database operations
- Efficient data retrieval patterns
- Better memory management

## Migration from Old System

The new architecture is fully backward compatible. Existing code will continue to work while gaining access to new features:

```typescript
// Old way (still works)
await contextManager.addMessage("user", "Hello");

// New way (additional features)
const stats = await contextManager.getComprehensiveStats();
const searchResults = await contextManager.searchMessages("hello");
```

## Future Enhancements

### Planned Features

- **Multiple Storage Backends**: SQLite, PostgreSQL, MongoDB
- **Real-time Sync**: WebSocket-based synchronization
- **Advanced Indexing**: Full-text search with Elasticsearch
- **Data Compression**: Automatic compression for large conversations
- **Backup Services**: Cloud backup integration

### Plugin System

- **Custom Summarizers**: AI-powered summarization
- **Storage Adapters**: Custom storage implementations
- **Analytics Plugins**: Custom reporting and metrics
- **Export Formats**: Custom export formats (PDF, Markdown, etc.)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check browser IndexedDB support
   - Verify localStorage availability
   - Check console for error messages

2. **Messages Not Saving**
   - Verify storage permissions
   - Check available storage space
   - Test database connection

3. **Performance Issues**
   - Monitor message count and token usage
   - Use cleanup methods regularly
   - Check for memory leaks

### Debug Commands

```typescript
// Test database connection
await contextManager.testDatabaseConnection();

// Get comprehensive stats
const stats = await contextManager.getComprehensiveStats();

// Test storage functionality
await storageManager.testStorage();
```

## Best Practices

### 1. **Regular Cleanup**

```typescript
// Run cleanup weekly
setInterval(
  async () => {
    await contextManager.advancedCleanup({
      maxMessages: 100,
      maxAge: 7,
    });
  },
  7 * 24 * 60 * 60 * 1000
);
```

### 2. **Monitor Storage Usage**

```typescript
// Check storage stats regularly
const stats = await contextManager.getComprehensiveStats();
if (stats.storage.database.size > 10 * 1024 * 1024) {
  // 10MB
  console.warn("Storage usage is high");
}
```

### 3. **Efficient Message Retrieval**

```typescript
// Use specific queries instead of loading all messages
const userMessages = await contextManager.getMessagesByRole("user");
const recentMessages = await contextManager.getMessagesByDateRange(
  new Date(Date.now() - 24 * 60 * 60 * 1000),
  new Date()
);
```

This architecture provides a solid foundation for scalable, maintainable chatbot storage while preserving all existing functionality and adding powerful new features.
