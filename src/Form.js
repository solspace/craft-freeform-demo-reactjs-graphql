import React, { useEffect, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { gql, ApolloClient, InMemoryCache } from '@apollo/client';

const defaultFormProperties = {
    csrf: {
        name: '',
        token: '',
    },
    honeypot: {
        name: '',
        value: '',
    },
    reCaptchaName: '',
    mailingListName: '',
};

const RECAPTCHA_SITE_KEY = '1234567890abcdef';

const client = new ApolloClient({
    uri: 'https://www.example.com/graphql/api',
    headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest',
        'X-Craft-Solspace-Freeform-Mode': 'Headless',
    },
    cache: new InMemoryCache(),
});

async function getFormProperties(formId) {
    // See https://docs.solspace.com/craft/freeform/v4/developer/graphql/#how-to-render-a-form
    const response = await fetch(`https://www.example.com/my-module/freeform/form-properties/${formId}`, { headers: { 'Accept': 'application/json' }});

    if (!response.ok) {
        throw new Error('Failed to fetch Freeform form properties');
    }

    return response.json();
}

async function saveKitchenSinkSubmission(params) {
    const { reCaptchaValue, formProperties } = params;
    const { csrf, honeypot, reCaptchaName, mailingListName } = formProperties;

    // Update the mutation and variables properties with your own Freeform Form field names and values
    return await client.mutate({
        mutation: gql`
            mutation SaveKitchenSinkSubmission(
                $honeypotField: FreeformHoneypotInputType,
                $reCaptchaField: FreeformRecaptchaInputType,
                $csrfTokenField: FreeformCsrfTokenInputType,
                $checkboxField: String,
                $checkboxGroupField: [String],
                $confirmField: String,
                $dateTimeField: DateTime,
                $dynamicRecipientsField: String,
                $emailField: String,
                $fileField: [FreeformFileUploadInputType],
                $hiddenField: String,
                $mailingListField: Int,
                $multipleSelectField: [String],
                $numberField: Number,
                $opinionScaleField: String,
                $passwordField: String,
                $paymentField: String,
                $phoneField: String,
                $radioGroupField: String,
                $ratingField: Int,
                $regexField: String,
                $selectField: String,
                $signatureField: String,
                $tableField: [[String]],
                $textareaField: String,
                $textField: String,
                $websiteField: String
            ) {
                save_kitchenSink_Submission(
                    honeypot: $honeypotField
                    ${reCaptchaName}: $reCaptchaField
                    csrfToken: $csrfTokenField
                    checkboxField: $checkboxField
                    checkboxGroupField: $checkboxGroupField
                    confirmField: $confirmField
                    dateTimeField: $dateTimeField
                    dynamicRecipientsField: $dynamicRecipientsField
                    emailField: $emailField
                    fileField: $fileField
                    hiddenField: $hiddenField
                    ${mailingListName}: $mailingListField
                    multipleSelectField: $multipleSelectField
                    numberField: $numberField
                    opinionScaleField: $opinionScaleField
                    passwordField: $passwordField
                    payment: $paymentField
                    phoneField: $phoneField
                    radioGroupField: $radioGroupField
                    ratingField: $ratingField
                    regexField: $regexField
                    selectField: $selectField
                    signatureField: $signatureField
                    tableField: $tableField
                    textareaField: $textareaField
                    textField: $textField
                    websiteField: $websiteField
                ) {
                    submissionId
                    success
                }
            }
        `,
        variables: {
            honeypotField: {
                name: honeypot.name,
                value: honeypot.value,
            },
            csrfTokenField: {
                name: csrf.name,
                value: csrf.token,
            },
            reCaptchaField: {
                name: 'g-recaptcha-response',
                value: reCaptchaValue,
            },
            checkboxField: 'yes',
            checkboxGroupField: ['Option 1', 'Option 3'],
            confirmField: 'support@solspace.com',
            dateTimeField: '2023/05/18 7:46PM',
            dynamicRecipientsField: 'supportSolspaceCom',
            emailField: 'support@solspace.com',
            fileField: [{
                fileData: null,
                filename: null,
                url: 'https://www.example.com/cdn/image.webp',
            }],
            hiddenField: 'My hidden value',
            mailingListField: 1,
            multipleSelectField: ['Option 2', 'Option 3'],
            numberField: 6,
            opinionScaleField: '5',
            passwordField: 'letmein',
            paymentField: 'tok_0123456789',
            phoneField: '0123456789',
            radioGroupField: 'Option 2',
            ratingField: 8,
            regexField: 'Freeform',
            selectField: 'Option 2',
            signatureField: 'data:image/png;base64,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',
            tableField: [
                ['Solspace', 'Freeform'],
                ['Solspace', 'Calendar'],
                ['Solspace', 'Express Forms']
            ],
            textareaField: 'Solspace',
            textField: 'Freeform',
            websiteField: 'https://solspace.com',
        },
    });
}

export default function Form() {
    const [formProperties, setFormProperties] = useState(defaultFormProperties);
    const [reCaptchaValue, setReCaptchaValue] = useState('');

    const handleChange = (token) => {
        setReCaptchaValue(token);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const response = await saveKitchenSinkSubmission({ reCaptchaValue, formProperties });
        console.log(response);
    };

    /**
     * Note the ignore variable which is initialized to false, and is set to true during cleanup.
     * This ensures your code doesn't suffer from "race conditions": network responses may arrive in a different order than you sent them.
     */
    useEffect(() => {
        let ignore = false;

        // Set your Freeform Form ID from Craft.
        const formId = 3;

        getFormProperties(formId).then(formProperties => {
            if (!ignore) {
                setFormProperties(formProperties);
            }
        });

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <form
            className="text-center"
            onSubmit={handleSubmit}
        >
            <ReCAPTCHA
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleChange}
            />
            <button
                className="btn-primary"
                type="submit"
            >
                Submit
            </button>
        </form>
    );
};
