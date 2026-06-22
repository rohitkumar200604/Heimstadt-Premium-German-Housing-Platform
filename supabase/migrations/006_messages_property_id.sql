-- supabase/migrations/006_messages_property_id.sql
-- Add property_id column to messages table linking to public.properties
-- and create landlord RLS policies to view/update listing support messages

ALTER TABLE public.messages
ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;

-- Create policy for landlords to view messages linked to their properties
CREATE POLICY "Landlords can view messages for their properties" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            JOIN public.landlord_profiles lp ON lp.id = p.landlord_id
            WHERE p.id = messages.property_id
            AND lp.user_id = auth.uid()
        )
    );

-- Create policy for landlords to update messages (e.g. marking as read) linked to their properties
CREATE POLICY "Landlords can update messages for their properties" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            JOIN public.landlord_profiles lp ON lp.id = p.landlord_id
            WHERE p.id = messages.property_id
            AND lp.user_id = auth.uid()
        )
    );
