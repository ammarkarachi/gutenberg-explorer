# Gutenberg Explorer

Gutenberg Explorer is a modern web application that allows users to explore, read, and analyze books from Project Gutenberg's vast collection of free ebooks.

## Features

- **Book Fetching**: Search for books from the Gitenberg project
- **Book Display**: Read books directly in the browser
- **Book Saving**: Save books for offline access and future reading
- **AI-Powered Analysis**: Analyze book content using LLMs to identify:
  - Key characters and their importance
  - Plot summaries
  - Sentiment and tone analysis
  - Major themes and motifs
  - Character Relationship and Influence on stories
- **History Tracking**: View recently accessed books
- **Search & Filter**: Find saved books and analyses

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, d3
- **Styling**: Tailwind CSS, Shadcn UI
- **State Management**: Zustand
- **Data Fetching**: Axios
- **LLM Integration**: Groq AI (llama-3.3-70b-versatile & llama3-8b-8192)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/gutenberg-explorer.git
   cd gutenberg-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Set large and small model
   ```bash 
   export GROQ_LARGE_MODEL = '<model name>'
   export GROQ_SMALL_MODEL= '<model name>'
   ```
   
3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
gutenberg-explorer/
├── components/     # React components
├── app/            # Next.js app directory with routes
├── lib/            # Utility functions and state management
├── types/          # TypeScript type definitions
└── public/         # Static assets
```

## Usage

1. Search with ID or Name
2. View the book content and metadata
3. Run AI-powered analysis to gain deeper insights into the book chapters
   a. Character Analysis 
   b. Summary
   c. Sentiment
   d. Themes
   e. Character Relationships
4. Save books and analyses for future reference

## Deployment

This application is deployed to vercel.

## Future Enhancements

- Book recommendations based on reading history
- Social sharing of analyses
- Integration with more LLM providers
- Enhanced metadata extraction
- Mobile application

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Project Gutenberg](https://www.gutenberg.org/) for providing access to free ebooks
- [Project Gitenber](https://github.com/GITenberg) for providing books and list of books
- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the framework