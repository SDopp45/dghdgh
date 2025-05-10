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

    // Récupérer le lien pour vérifier qu'il s'agit bien d'un formulaire
    const linkResult = await sql`
      SELECT id, type
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
    const linkId = parseInt(params.id, 10);
    
    // Vérifier si c'est bien un formulaire
    if (link.type !== 'form') {
      return NextResponse.json(
        { error: 'This link is not a form' },
        { status: 400 }
      );
    }

    try {
      // Récupérer l'ID du formulaire associé au lien
      const formLinkResult = await sql`
        SELECT form_id
        FROM "${schema}".link_forms
        WHERE link_id = ${linkId}
        LIMIT 1
      `;
      
      if (formLinkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No form associated with this link' },
          { status: 404 }
        );
      }
      
      const formId = formLinkResult.rows[0].form_id;
      
      // Insérer dans la table form_responses avec form_id
      const submissionResult = await sql`
        INSERT INTO "${schema}".form_responses (
          form_id,
          response_data,
          ip_address,
          user_agent,
          created_at
        ) VALUES (
          ${formId},
          ${JSON.stringify(formData)}::jsonb,
          ${request.headers.get('x-forwarded-for') || null},
          ${request.headers.get('user-agent') || null},
          NOW()
        )
        RETURNING id, created_at
      `;

      if (submissionResult.rows.length === 0) {
        throw new Error('Failed to create form submission');
      }

      // Mettre à jour le compteur de clics pour le lien
      await sql`
        UPDATE "${schema}".links
        SET clicks = COALESCE(clicks, 0) + 1,
            updated_at = NOW()
        WHERE id = ${linkId}
      `;

      return NextResponse.json({
        success: true,
        submissionId: submissionResult.rows[0].id
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Si la table n'existe pas encore (pendant la migration), essayer l'ancienne méthode
      try {
        console.log('Trying fallback to legacy tables...');
        
        // Insérer d'abord dans form_submissions
        const submissionResult = await sql`
          INSERT INTO "${schema}".form_submissions (
            form_id,
            form_data,
            link_id,
            created_at,
            updated_at
          ) VALUES (
            ${linkId},
            ${JSON.stringify(formData)}::jsonb,
            ${linkId},
            NOW(),
            NOW()
          )
          RETURNING id, created_at
        `;

        if (submissionResult.rows.length === 0) {
          throw new Error('Failed to create form submission');
        }

        // Ensuite insérer dans form_responses pour une double sauvegarde
        await sql`
          INSERT INTO "${schema}".form_responses (
            form_id,
            data,
            created_at
          ) VALUES (
            ${linkId},
            ${JSON.stringify(formData)}::jsonb,
            ${submissionResult.rows[0].created_at}
          )
          ON CONFLICT DO NOTHING
        `;

        return NextResponse.json({
          success: true,
          submissionId: submissionResult.rows[0].id
        });
      } catch (fallbackError) {
        console.error('Fallback failed too:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to submit form' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
} 