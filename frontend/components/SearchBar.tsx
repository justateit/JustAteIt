import { icons } from '@/constants/icons';
import React from 'react';
import { Image, StyleSheet, TextInput, View } from 'react-native';

interface Props {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing?: () => void;
    onPress?: () => void;
}

export const SearchBar = ({
    value,
    onChangeText,
    onSubmitEditing,
    placeholder,
    onPress
}: Props) => {
    return (
        <View style={styles.container}>
            <Image
                source={icons.search}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
                tintColor="#9FA1B7"
            />
            <TextInput
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor="#9FA1B7"
                style={{ flex: 1, marginLeft: 8, color: "#FFFFFF" }}
                onSubmitEditing={onSubmitEditing}
                onFocus={onPress}
                returnKeyType="search"
            />
        </View>
    )
}

export default SearchBar
const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 25,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
});