# Gutenberg Explorer

Gutenberg Explorer is a modern web application that allows users to explore, read, and analyze books from Project Gutenberg's vast collection of free ebooks.

## Features

- **Book Fetching**: Search for books from Project Gutenberg by ID
- **Book Display**: Read books directly in the browser
- **Book Saving**: Save books for offline access and future reading
- **AI-Powered Analysis**: Analyze book content using LLMs to identify:
  - Key characters and their importance
  - Plot summaries
  - Sentiment and tone analysis
  - Major themes and motifs
- **History Tracking**: View recently accessed books
- **Search & Filter**: Find saved books and analyses

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **State Management**: Zustand
- **Data Fetching**: Axios
- **LLM Integration**: OpenAI API (or alternative)

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

3. Configure environment variables:
   Create a `.env.local` file in the root directory and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

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

1. Enter a Project Gutenberg book ID in the search field (e.g., 1342 for "Pride and Prejudice")
2. View the book content and metadata
3. Run AI-powered analysis to gain deeper insights into the book
4. Save books and analyses for future reference

## Deployment

This application can be easily deployed to Vercel, Netlify, or any other hosting service that supports Next.js applications.

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
- [Shadcn UI](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the framework