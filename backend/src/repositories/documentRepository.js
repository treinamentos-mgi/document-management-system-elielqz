const documents = new Map();

function create(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id);
}

function findAll() {
  return Array.from(documents.values()).sort(
    (left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt),
  );
}

module.exports = {
  create,
  findById,
  findAll,
};
