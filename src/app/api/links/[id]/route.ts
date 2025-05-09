import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const schema = clientId ? `client_${clientId}` : 'template';

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { formData } = body;

    if (!formData) {
      return NextResponse.json(
        { error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Récupérer le lien pour obtenir le form_definition
    const linkResult = await sql`
      SELECT id, form_definition, user_id
      FROM "${schema}".links
      WHERE id = ${params.id}
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    const link = linkResult.rows[0];

    // Insérer la soumission dans form_submissions
    const submissionResult = await sql`
      INSERT INTO "${schema}".form_submissions (
        form_id,
        form_data,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        ${params.id}::text,
        ${JSON.stringify(formData)}::jsonb,
        ${link.user_id},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (submissionResult.rows.length === 0) {
      throw new Error('Failed to create form submission');
    }

    return NextResponse.json({
      success: true,
      submissionId: submissionResult.rows[0].id
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
} 