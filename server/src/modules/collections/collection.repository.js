// Data access for an ordered collection (experience, projects, ...).
module.exports = function createCollectionRepository(Model) {
  return {
    list: () => Model.find().sort({ order: 1, createdAt: 1 }).lean(),
    create: (data) => Model.create(data),
    update: (id, data) => Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
    remove: (id) => Model.findByIdAndDelete(id),
  };
};
