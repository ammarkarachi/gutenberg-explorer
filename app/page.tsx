import BookSearch from '@/components/BookSearch';
import BookList from '@/components/BookList';

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold mb-4">Gutenberg Explorer</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover, read, and analyze classic literature from Project
          Gutenberg&apos;s vast collection of free ebooks.
        </p>
      </section>

      <section className="max-w-2xl mx-auto">
        <BookSearch />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Recent Books</h2>
        <BookList />
      </section>
    </div>
  );
}
