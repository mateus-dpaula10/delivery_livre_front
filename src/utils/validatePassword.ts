export function isStrongPassword(password: string): boolean {
    const minLength = /.{8,}/;
    const upperCase = /[A-Z]/;
    const lowerCase = /[a-z]/;
    const number = /[0-9]/;
    const specialChar = /[^A-Za-z0-9]/;

    return (
        minLength.test(password) &&
        upperCase.test(password) &&
        lowerCase.test(password) &&
        number.test(password) &&
        specialChar.test(password)
    );
}