export function up (knex) {
  return knex.schema.createTable("job_applications", function (table) {
    table.increments("id").primary();

    table.string("name", 150);
    table.string("job_name", 150);

    table.string("number_phone", 20);
    table.string("email", 255).unique();

    table.string("location", 150);
    table.string("neighborhood", 150);

    table.text("linkedin_url");
    table.boolean("has_experience");
    table.boolean("has_previous_application");

    table.decimal("salary_intention", 10, 2);
    table.string("starts", 150);

    table.text("cv_url");
  });
}

export function down (knex) {
  return knex.schema.dropTable("job_applications");
}
