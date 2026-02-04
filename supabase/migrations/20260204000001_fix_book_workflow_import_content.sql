-- Fix book workflow import function to include content field
--
-- Problem: The import_book_workflows() function was not saving the 'content' field
-- from CSV data, leaving all workflows with NULL content.
--
-- Solution: Update the INSERT statement to include the content field.

CREATE OR REPLACE FUNCTION import_book_workflows(csv_data jsonb, file_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    row_data jsonb;
    dept_record RECORD;
    cat_record RECORD;
    book_record RECORD;
    workflow_record RECORD;
    dept_slug text;
    cat_slug text;
    book_slug text;
    workflow_slug text;
    created_cats integer := 0;
    created_books integer := 0;
    created_workflows integer := 0;
    errors jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- Process each row
    FOR row_data IN SELECT * FROM jsonb_array_elements(csv_data)
    LOOP
        BEGIN
            -- Generate slugs
            dept_slug := lower(trim(regexp_replace(row_data->>'department', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            cat_slug := lower(trim(regexp_replace(row_data->>'category', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            book_slug := lower(trim(regexp_replace(row_data->>'book', '[^a-zA-Z0-9]+', '-', 'g'), '-'));
            workflow_slug := lower(trim(regexp_replace(row_data->>'workflow', '[^a-zA-Z0-9]+', '-', 'g'), '-'));

            -- Find department
            SELECT * INTO dept_record
            FROM book_workflow_departments
            WHERE slug = dept_slug;

            IF NOT FOUND THEN
                errors := errors || jsonb_build_object(
                    'row', row_data,
                    'error', 'Department not found: ' || (row_data->>'department')
                );
                CONTINUE;
            END IF;

            -- Find or create category
            SELECT * INTO cat_record
            FROM book_workflow_categories
            WHERE department_id = dept_record.id AND slug = cat_slug;

            IF NOT FOUND THEN
                INSERT INTO book_workflow_categories (department_id, name, slug)
                VALUES (dept_record.id, row_data->>'category', cat_slug)
                RETURNING * INTO cat_record;
                created_cats := created_cats + 1;
            END IF;

            -- Find or create book
            SELECT * INTO book_record
            FROM books
            WHERE slug = book_slug;

            IF NOT FOUND THEN
                INSERT INTO books (title, slug, author)
                VALUES (row_data->>'book', book_slug, row_data->>'author')
                RETURNING * INTO book_record;
                created_books := created_books + 1;
            END IF;

            -- Check if workflow exists
            SELECT * INTO workflow_record
            FROM book_workflows
            WHERE book_id = book_record.id AND slug = workflow_slug;

            -- Create workflow if it doesn't exist
            IF NOT FOUND THEN
                INSERT INTO book_workflows (
                    book_id,
                    category_id,
                    name,
                    slug,
                    activity_type,
                    problem_goal,
                    content
                )
                VALUES (
                    book_record.id,
                    cat_record.id,
                    row_data->>'workflow',
                    workflow_slug,
                    row_data->>'activity_type',
                    row_data->>'problem_goal',
                    row_data->>'content'
                );

                created_workflows := created_workflows + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors || jsonb_build_object(
                'row', row_data,
                'error', SQLERRM
            );
        END;
    END LOOP;

    -- Log the import
    INSERT INTO workflow_import_logs (
        file_name,
        total_rows,
        successful_rows,
        failed_rows,
        categories_created,
        departments_created,
        workflows_created,
        error_summary,
        completed_at
    ) VALUES (
        file_name,
        jsonb_array_length(csv_data),
        jsonb_array_length(csv_data) - jsonb_array_length(errors),
        jsonb_array_length(errors),
        created_cats,
        0, -- departments are predefined
        created_workflows,
        CASE WHEN jsonb_array_length(errors) > 0 THEN errors ELSE NULL END,
        NOW()
    ) RETURNING to_jsonb(workflow_import_logs) INTO result;

    RETURN jsonb_build_object(
        'success', true,
        'created_categories', created_cats,
        'created_books', created_books,
        'created_workflows', created_workflows,
        'errors', errors,
        'import_log', result
    );
END;
$$;